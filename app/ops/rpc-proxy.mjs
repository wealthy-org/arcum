// Local JSON-RPC relay for hosts that reset Foundry's TLS handshake.
//
//     bun app/ops/rpc-proxy.mjs            # listens on 127.0.0.1:8547
//     forge script ... --rpc-url http://127.0.0.1:8547
//
// Why this exists: `cast`/`forge` are built on a Rust HTTP client whose TLS fingerprint is
// being reset at the edge for this endpoint (curl reports the same "Recv failure: Connection
// was reset"), while Bun's fetch and Python's urllib connect to the identical URL without
// trouble. That is an edge/WAF behaviour against one client, not an outage — the chain itself
// answers `eth_chainId` = 0xb626 through Bun.
//
// So the relay does the transport hop with a client that is accepted, and everything above it
// (forge, cast) speaks plain HTTP to localhost. It forwards bytes; it does not sign, cache,
// rewrite, or hold keys. Reads and writes behave identically to talking to the node directly.

const UPSTREAM = process.env.RPC_UPSTREAM ?? "https://rpc.testnet.chain.robinhood.com";
const PORT = Number(process.env.RPC_PROXY_PORT ?? 8547);

// Serialize upstream calls. Forge fans out several requests at once (chainId, nonce, gas,
// block, storage) and the edge starts closing sockets when they arrive together; the retries
// alone did not save the broadcast. One request at a time costs milliseconds locally and
// removes the burst that triggers the reset.
let queue = Promise.resolve();
const serialize = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

const server = Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  idleTimeout: 60,
  async fetch(req) {
    if (req.method === "GET" || req.method === "HEAD") {
      // Foundry and cast probe the endpoint before doing anything else.
      return Response.json({ ok: true, upstream: UPSTREAM, note: "JSON-RPC relay; POST only" });
    }
    if (req.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }

    const body = await req.text();

    // `connection: close` is not decoration: with keep-alive the edge drops a reused socket
    // mid-run and Bun surfaces it as "socket connection was closed unexpectedly", which forge
    // reports as a fork failure. A fresh connection per request is slower and reliable.
    const attempt = async () => {
      const res = await fetch(UPSTREAM, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // The upstream rejects requests with no User-Agent, same as the vol publisher found.
          "user-agent": "arcum-rpc-relay/1.0 (+bun)",
          accept: "application/json",
          connection: "close",
        },
        body,
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text();
      // An empty body or a 5xx is the same failure as a closed socket from forge's point of
      // view, so treat it as retryable instead of passing the wreckage through.
      if (!text.trim() || res.status >= 500) {
        throw new Error(`upstream status ${res.status}, body ${text.length} bytes`);
      }
      return { status: res.status, ctype: res.headers.get("content-type"), text };
    };

    let last;
    for (let i = 0; i < 6; i++) {
      try {
        const out = await serialize(attempt);
        return new Response(out.text, {
          status: out.status,
          headers: { "content-type": out.ctype ?? "application/json" },
        });
      } catch (err) {
        last = err;
        await new Promise((r) => setTimeout(r, 400 * 2 ** Math.min(i, 4)));
      }
    }

    // Surface the failure as a JSON-RPC error so forge reports it instead of hanging.
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: `relay upstream error: ${String(last)}` } },
      { status: 502 },
    );
  },
});

console.log(`rpc relay: http://127.0.0.1:${server.port} -> ${UPSTREAM}`);