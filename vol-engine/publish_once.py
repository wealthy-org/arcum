#!/usr/bin/env python3
"""
One unattended volatility publish cycle: refresh the price history, then post it.

This exists so the scheduler has a single entry point that is safe to keep in git. The
publisher key is *not* written here — it is read from `app/.env` (gitignored) at runtime.

    python publish_once.py            # fetch fresh closes, then post
    python publish_once.py --dry-run  # fetch, compute, encode, send nothing

Exit codes are the union of `fetch_prices.py` and `post_vol.py`, so a scheduler can tell
"no data" (1) from "reading rejected" (5) from "refused to invent sigma" (4) without parsing
text. Anything non-zero means the oracle was left untouched and needs a human.

Why the cycle re-fetches every time instead of reusing a stale file: a `validUntil` of
`now + 3600` attached to a week-old price is a fresh stamp on stale information. The fetch
is one HTTPS call per symbol and costs nothing.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENV_FILE = HERE.parent / "app" / ".env"
SYMBOLS = "NVDA,AAPL,QQQ"

# Variables post_vol.py needs. Stock addresses are not secrets, but they are deployment
# facts, so they live in the same .env as the RPC and the key rather than in this file.
REQUIRED = ("KEEPER_PRIVATE_KEY", "RH_TESTNET_RPC")


def load_env(path: Path) -> None:
    """Minimal .env reader. Does not overwrite variables already present in the environment."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Fetch prices then publish volatility to VolOracle")
    ap.add_argument("--dry-run", action="store_true", help="compute and encode, send nothing")
    ap.add_argument("--symbols", default=SYMBOLS)
    ap.add_argument("--ttl", default="3600")
    args = ap.parse_args(argv)

    load_env(ENV_FILE)

    missing = [k for k in REQUIRED if not os.environ.get(k)]
    if missing:
        print(f"FATAL missing env: {', '.join(missing)} (expected in {ENV_FILE})", file=sys.stderr)
        return 2

    os.environ.setdefault("VOL_ORACLE_ADDRESS", "0x09f2B03288A72C5B6F31B9Db19548aca42116B81")
    os.environ.setdefault("VOL_ENGINE_RPC", os.environ["RH_TESTNET_RPC"])
    os.environ.setdefault("VOL_PUBLISHER_PRIVATE_KEY", os.environ["KEEPER_PRIVATE_KEY"])

    symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
    for sym in symbols:
        if not os.environ.get(f"STOCK_{sym}"):
            print(f"FATAL missing env STOCK_{sym}", file=sys.stderr)
            return 2

    import fetch_prices  # noqa: E402  (needs the env above only for the proxy settings)
    import post_vol  # noqa: E402

    rc = fetch_prices.main(["--symbols", ",".join(symbols)])
    if rc != 0:
        print("fetch failed; nothing posted", file=sys.stderr)
        return rc

    post_args = ["--symbols", ",".join(symbols), "--ttl", args.ttl]
    for sym in symbols:
        post_args += ["--prices", f"{sym}=data/{sym.lower()}_daily.json"]
    if args.dry_run:
        post_args.append("--dry-run")

    return post_vol.main(post_args)


if __name__ == "__main__":
    raise SystemExit(main())
