// Local JSON-RPC proxy for Robinhood Chain mainnet (chainId 4663).
//
// Why this exists: some ISPs (seen on IndiHome/Telkomsel) hijack DNS for
// rpc.mainnet.chain.robinhood.com and answer with a captive portal instead of Cloudflare,
// which makes TLS fail with SEC_E_CERT_EXPIRED / "invalid peer certificate: Expired".
// This proxy connects to the real Cloudflare edge IP with the correct SNI/Host header,
// so forge/cast can talk to mainnet from behind that DNS hijack.
//
// Usage:
//   node scripts/rpc-proxy.mjs                       # listen on 127.0.0.1:8545
//   node scripts/rpc-proxy.mjs --port 8546 --ip 172.66.147.70
//   PORT=8545 node scripts/rpc-proxy.mjs
//
// Then:
//   forge script script/DeployProduction.s.sol:DeployProduction --rpc-url http://127.0.0.1:8545
//
// Read-only by intent: this proxy does not inspect, filter or modify payloads. It is a pipe.
// Stop it when done (Ctrl+C). Do not expose it beyond 127.0.0.1.

import http from "node:http";
import https from "node:https";
import { parseArgs } from "node:util";

const HOST = "rpc.mainnet.chain.robinhood.com";
const FALLBACK_IPS = ["104.20.46.209", "172.66.147.70"];

const { values } = parseArgs({
  options: {
    port: { type: "string", default: process.env.PORT ?? "8545" },
    ip: { type: "string", default: process.env.RPC_EDGE_IP ?? FALLBACK_IPS[0] },
    host: { type: "string", default: HOST },
  },
});

const listenPort = Number(values.port);
const edgeIp = values.ip;
const hostname = values.host;

const agent = new https.Agent({ keepAlive: true, maxSockets: 32 });

function forward(body, res) {
  const req = https.request(
    {
      host: edgeIp, // real Cloudflare edge, not the hijacked DNS answer
      servername: hostname, // SNI + certificate must match the public hostname
      port: 443,
      method: "POST",
      path: "/",
      agent,
      headers: {
        host: hostname,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
        accept: "*/*",
        "user-agent": "arcum-rpc-proxy/1.0",
      },
    },
    (upstream) => {
      res.writeHead(upstream.statusCode ?? 502, {
        "content-type": upstream.headers["content-type"] ?? "application/json",
      });
      upstream.pipe(res);
    },
  );

  req.on("error", (err) => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32603, message: String(err.message) } }));
  });

  req.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ proxy: "robinhood-mainnet", upstream: `${hostname} (${edgeIp})`, rpc: `http://127.0.0.1:${listenPort}` }));
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "POST only" }));
    return;
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => forward(Buffer.concat(chunks).toString("utf8"), res));
});

server.listen(listenPort, "127.0.0.1", () => {
  console.log(`rpc-proxy: http://127.0.0.1:${listenPort} -> https://${hostname} (edge ${edgeIp})`);
  console.log("Ctrl+C to stop.");
});