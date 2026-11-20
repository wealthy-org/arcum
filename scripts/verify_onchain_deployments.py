#!/usr/bin/env python3
"""Ask the chain whether the register is real.

Reads deployments/<chainId>.json, batches `eth_getCode` against the network's RPC
(with fallbacks), and writes artifacts/onchain/verify_<chainId>.json.

Exit codes: 0 all addresses have bytecode, 1 something is empty or unknown.

This exists because the register page once rendered "Belum dideploy" for
contracts that were live: an unreachable RPC was mistaken for an absent
deployment. A check that proves presence is only trustworthy if it can also
report "I could not reach the node" separately from "there is nothing there".
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

NETWORKS = {
    46630: {
        "name": "Robinhood Chain Testnet",
        "endpoints": ["https://rpc.testnet.chain.robinhood.com"],
        "env_extra": "RPC_46630_EXTRA",
    },
    4663: {
        "name": "Robinhood Chain Mainnet",
        "endpoints": ["https://rpc.mainnet.chain.robinhood.com"],
        "env_extra": "RPC_4663_EXTRA",
    },
}


def rpc(url: str, payload, timeout: int = 40, tries: int = 3):
    """POST a JSON-RPC payload. Returns parsed JSON or None when the endpoint is unusable."""
    for attempt in range(tries):
        proc = subprocess.run(
            [
                "curl",
                "-k",  # testnet explorer/mainnet certs are broken; cast refuses them
                "-s",
                "-L",
                "-m",
                str(timeout),
                "-X",
                "POST",
                url,
                "-H",
                "Content-Type: application/json",
                "--data",
                json.dumps(payload),
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        body = (proc.stdout or "").strip()
        if body.startswith("{") or body.startswith("["):
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                pass
        time.sleep(1.5 * (attempt + 1))
    return None


def endpoints_for(chain_id: int) -> list[str]:
    cfg = NETWORKS[chain_id]
    urls = list(cfg["endpoints"])
    urls += [u.strip() for u in os.environ.get(cfg["env_extra"], "").split(",") if u.strip()]
    return list(dict.fromkeys(urls))


def collect_addresses(manifest: dict) -> dict[str, str]:
    out = {}
    for key, value in manifest.items():
        if isinstance(value, str) and value.startswith("0x") and len(value) == 42:
            out[key] = value
    out.update(manifest.get("libraries") or {})
    return out


def main() -> int:
    chain_id = int(sys.argv[1]) if len(sys.argv) > 1 else 46630
    if chain_id not in NETWORKS:
        print(f"unknown chain {chain_id}; known: {sorted(NETWORKS)}")
        return 2

    manifest_path = ROOT / "deployments" / f"{chain_id}.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    addrs = collect_addresses(manifest)
    if not addrs:
        print(f"no addresses in {manifest_path}")
        return 2

    attempts = []
    chosen = None
    response = None
    for url in endpoints_for(chain_id):
        started = time.time()
        batch = [{"jsonrpc": "2.0", "id": 1, "method": "eth_chainId", "params": []},
                 {"jsonrpc": "2.0", "id": 2, "method": "eth_blockNumber", "params": []}]
        batch += [
            {"jsonrpc": "2.0", "id": 100 + i, "method": "eth_getCode", "params": [a, "latest"]}
            for i, a in enumerate(addrs.values())
        ]
        out = rpc(url, batch)
        ok = bool(out) and any(row.get("id") == 1 for row in out)
        attempts.append({"url": url, "ok": ok, "ms": int((time.time() - started) * 1000)})
        if ok:
            chosen, response = url, out
            break

    if not chosen:
        report = {
            "chainId": chain_id,
            "network": NETWORKS[chain_id]["name"],
            "reachable": False,
            "attempts": attempts,
            "verdict": "UNKNOWN — tidak ada endpoint yang menjawab; bukan bukti kontrak belum dideploy",
        }
        out_path = ROOT / "artifacts" / "onchain" / f"verify_{chain_id}.json"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"UNREACHABLE: {[a['url'] for a in attempts]}")
        print(f"report: {out_path.relative_to(ROOT)}")
        return 1

    by_id = {row.get("id"): row for row in response}
    answered_chain = int(by_id[1]["result"], 16)
    block = int(by_id[2]["result"], 16) if by_id.get(2, {}).get("result") else None

    results = []
    for i, (name, addr) in enumerate(addrs.items()):
        row = by_id.get(100 + i) or {}
        code = row.get("result") or ""
        size = max(0, (len(code) - 2) // 2) if code.startswith("0x") else 0
        results.append(
            {
                "name": name,
                "address": addr,
                "bytes": size,
                "status": "active" if size > 0 else "empty",
            }
        )

    active = sum(1 for r in results if r["status"] == "active")
    report = {
        "chainId": chain_id,
        "network": NETWORKS[chain_id]["name"],
        "reachable": True,
        "rpc": chosen,
        "answeredChainId": answered_chain,
        "chainIdMatches": answered_chain == chain_id,
        "block": block,
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "deployBlockInManifest": manifest.get("deployBlock"),
        "active": active,
        "empty": len(results) - active,
        "total": len(results),
        "attempts": attempts,
        "results": results,
        "verdict": (
            f"VERIFIED — {active}/{len(results)} alamat punya bytecode di chain {chain_id}"
            if active == len(results) and answered_chain == chain_id
            else f"MISMATCH — {active}/{len(results)} punya bytecode; chain menjawab {answered_chain}"
        ),
    }

    out_path = ROOT / "artifacts" / "onchain" / f"verify_{chain_id}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(f"{'name':<18} {'address':<44} {'bytes':>8}  status")
    for r in results:
        print(f"{r['name']:<18} {r['address']:<44} {r['bytes']:>8,}  {r['status']}")
    print()
    print(f"rpc      {chosen}")
    print(f"chainId  answered {answered_chain} (expected {chain_id})")
    print(f"block    {block:,}" if block else "block    ?")
    print(f"verdict  {report['verdict']}")
    print(f"report   {out_path.relative_to(ROOT)}")
    return 0 if active == len(results) and answered_chain == chain_id else 1


if __name__ == "__main__":
    raise SystemExit(main())