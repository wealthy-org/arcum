// Local JSON-RPC relay for Robinhood Chain Mainnet (4663)
import https from "node:https";

const PORT = 8548;
const HOST = "172.66.147.70";
const SNI = "rpc.mainnet.chain.robinhood.com";

const server = Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req) {
    if (req.method === "GET" || req.method === "HEAD") {
      return Response.json({ ok: true, chainId: 4663, upstream: "https://" + SNI });
    }
    if (req.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }

    const body = await req.text();
    return new Promise((resolve) => {
      const nodeReq = https.request({
        host: HOST,
        port: 443,
        servername: SNI,
        method: "POST",
        headers: {
          "host": SNI,
          "content-type": "application/json",
          "user-agent": "arcum-rpc-relay/1.0 (+bun)",
          "connection": "close"
        }
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          resolve(new Response(data, {
            status: res.statusCode || 200,
            headers: { "content-type": "application/json" }
          }));
        });
      });

      nodeReq.on("error", (err) => {
        resolve(new Response(JSON.stringify({ error: err.message }), { status: 502 }));
      });

      nodeReq.write(body);
      nodeReq.end();
    });
  }
});

console.log(`Mainnet RPC Relay running on http://127.0.0.1:${PORT}`);
