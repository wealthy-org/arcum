#!/usr/bin/env python3
"""
CLI: compute readings with the volatility engine and post them to `VolOracle.postMany`.

This is the keeper the docs describe. It replaces the old EIP-712 `signer.py` flow, which produced signatures for a
write path `VolOracle.sol` does not have (see the deprecation notice in `vol_engine/signer.py`).

Examples
--------
Check wiring without sending anything:
    python post_vol.py --symbols NVDA,AAPL,QQQ --dry-run

Post live readings from a price history file:
    python post_vol.py --symbols NVDA --prices NVDA=./data/nvda.json --ttl 3600

Environment (or an .env file you source yourself):
    VOL_ENGINE_RPC or RH_RPC        JSON-RPC endpoint
    VOL_ORACLE_ADDRESS              VolOracle address
    VOL_PUBLISHER_PRIVATE_KEY       publisher key (or KEEPER_PRIVATE_KEY)
    STOCK_NVDA / STOCK_AAPL / STOCK_QQQ   stock token addresses, one env var per symbol

The script computes a realised volatility from recent prices, floors and caps it into a sane band, applies the 25%
per-update shift limit (the same guard the reference engine implements), pre-checks every reading against the on-chain
`VolConfig`, and only then sends one `postMany` transaction. Nothing is posted if any symbol fails validation.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

from vol_engine.publisher import VolPublisher, VolPublisherError, VolReading
from vol_engine.volatility import (
    MAX_SIGMA_BPS,
    MIN_SIGMA_BPS,
    calculate_realized_volatility,
    validate_volatility_shift,
)


# ---------------------------------------------------------------------------------------------------- inputs


def load_prices(spec: str) -> List[float]:
    """`SYMBOL=path.json` where the file holds either a JSON array of numbers or {"prices": [...]}."""
    if "=" not in spec:
        raise SystemExit(f"--prices expects SYMBOL=path, got {spec!r}")
    symbol, path = spec.split("=", 1)
    raw = json.loads(Path(path).read_text())
    values = raw["prices"] if isinstance(raw, dict) else raw
    prices = [float(v) for v in values]
    if len(prices) < 3:
        raise SystemExit(f"{symbol}: need at least 3 prices to compute realised volatility, got {len(prices)}")
    return prices


def stock_addresses(symbols: List[str]) -> Dict[str, str]:
    out: Dict[str, str] = {}
    missing: List[str] = []
    for sym in symbols:
        addr = os.environ.get(f"STOCK_{sym.upper()}")
        if addr:
            out[sym] = addr
        else:
            missing.append(f"STOCK_{sym.upper()}")
    if missing:
        raise SystemExit("missing stock address env: " + ", ".join(missing))
    return out


def compose_reading(
    *,
    sigma_bps: int,
    previous_sigma_bps: Optional[int],
    ttl_seconds: int,
    skew_k: int,
    event_bump_bps: int,
    buy_block_from: int,
    buy_block_to: int,
    now: int,
) -> VolReading:
    """Clamp into the engine's own band, then apply the 25% per-update shift limit."""
    sigma = max(MIN_SIGMA_BPS, min(MAX_SIGMA_BPS, sigma_bps))
    if previous_sigma_bps:
        sigma = validate_volatility_shift(previous_sigma_bps, sigma)
    return VolReading(
        sigma_bps=sigma,
        skew_k=skew_k,
        event_bump_bps=event_bump_bps,
        buy_block_from=buy_block_from,
        buy_block_to=buy_block_to,
        valid_until=now + ttl_seconds,
        stale=False,  # the oracle derives this field; never post a stale flag
    )


# ---------------------------------------------------------------------------------------------------- main


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Post volatility readings to Arcum VolOracle")
    ap.add_argument("--symbols", required=True, help="comma-separated symbols, e.g. NVDA,AAPL,QQQ")
    ap.add_argument(
        "--prices",
        action="append",
        default=[],
        metavar="SYMBOL=PATH",
        help="price history JSON per symbol (repeatable); a constant fallback is used when omitted",
    )
    ap.add_argument("--ttl", type=int, default=3600, help="seconds until the reading expires (default 3600)")
    ap.add_argument("--skew-k", type=int, default=0, help="smile curvature term (default 0)")
    ap.add_argument("--event-bump-bps", type=int, default=0, help="extra IV for a known event (default 0)")
    ap.add_argument("--buy-block-from", type=int, default=0, help="earnings blackout start, unix seconds")
    ap.add_argument("--buy-block-to", type=int, default=0, help="earnings blackout end, unix seconds")
    ap.add_argument("--dry-run", action="store_true", help="validate and encode, but send nothing")
    ap.add_argument("--no-wait", action="store_true", help="do not wait for the receipt")
    args = ap.parse_args(argv)

    symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]
    if not symbols:
        raise SystemExit("--symbols is empty")

    price_files = {spec.split("=", 1)[0]: load_prices(spec) for spec in args.prices}
    stocks = stock_addresses(symbols)

    try:
        pub = VolPublisher.from_env()
    except VolPublisherError as exc:
        print(f"FATAL {exc}", file=sys.stderr)
        return 2

    print(f"publisher {pub.address}")
    print(f"oracle    {pub.oracle}")
    print(f"chainId   {pub.chain_id}")

    try:
        configs = pub.preflight(symbols, stocks)
    except VolPublisherError as exc:
        print(f"PREFLIGHT FAILED\n{exc}", file=sys.stderr)
        return 3

    now = int(time.time())
    readings: Dict[str, VolReading] = {}
    for sym in symbols:
        prices = price_files.get(sym)
        if prices is None:
            # No history supplied. Posting a made-up number would be worse than not posting, so refuse.
            print(f"{sym}: no --prices history supplied; refusing to invent a volatility", file=sys.stderr)
            return 4
        raw_sigma = calculate_realized_volatility(prices)
        previous_sigma, previous_ok = pub.current_sigma(stocks[sym])
        reading = compose_reading(
            sigma_bps=raw_sigma,
            previous_sigma_bps=previous_sigma if previous_ok else None,
            ttl_seconds=args.ttl,
            skew_k=args.skew_k,
            event_bump_bps=args.event_bump_bps,
            buy_block_from=args.buy_block_from,
            buy_block_to=args.buy_block_to,
            now=now,
        )
        try:
            pub.validate_reading(sym, configs[sym], reading, now)
        except VolPublisherError as exc:
            print(f"{sym}: reading rejected before sending: {exc}", file=sys.stderr)
            return 5
        readings[sym] = reading
        print(
            f"{sym}: raw {raw_sigma} bps -> posting {reading.sigma_bps} bps "
            f"(prev {'-' if not previous_ok else previous_sigma} bps, validUntil {reading.valid_until})"
        )

    if args.dry_run:
        calldata = pub.build_transaction([stocks[s] for s in symbols], [readings[s] for s in symbols])["data"]
        print(f"DRY RUN: {len(calldata) // 2 - 1} bytes of calldata, no transaction sent")
        return 0

    try:
        tx_hash = pub.post_many(symbols, stocks, readings, wait=not args.no_wait)
    except VolPublisherError as exc:
        print(f"POST FAILED {exc}", file=sys.stderr)
        return 6
    print(f"posted {len(symbols)} reading(s) in one tx: {tx_hash}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
