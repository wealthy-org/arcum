#!/usr/bin/env python3
"""
Fetch real daily close prices for the listed symbols and write them as the JSON files
`post_vol.py --prices` expects.

Why this file exists: `post_vol.py` refuses to compute a volatility without a price history
(`return 4` when `--prices` is missing), and that refusal is correct — inventing a sigma would
put a made-up number into a contract that prices real options. So the history has to come from
somewhere real. This script is that "somewhere", and it records exactly where.

Source: Yahoo Finance public chart endpoint (`/v8/finance/chart/<SYMBOL>?range=…&interval=1d`).
It returns the exchange's own daily closes, not a synthetic series. No API key is used.

Output per symbol, next to this script:
    data/<symbol>_daily.json   {"source": …, "symbol": …, "fetchedAtUtc": …, "closes": [...], "prices": [...]}

`closes` keeps the raw values for auditing; `prices` is what the vol engine reads.

Usage:
    python fetch_prices.py                     # default range 1y, symbols NVDA,AAPL,QQQ
    python fetch_prices.py --range 6mo --symbols NVDA
    python fetch_prices.py --out data/2026-11-20
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_SYMBOLS = "NVDA,AAPL,QQQ"
DEFAULT_RANGE = "1y"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range={rng}&interval=1d"


def fetch(symbol: str, rng: str, timeout: float = 30.0) -> dict:
    url = ENDPOINT.format(sym=symbol, rng=rng)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        payload = json.loads(resp.read().decode("utf-8"))

    chart = payload.get("chart") or {}
    if chart.get("error"):
        raise SystemExit(f"{symbol}: Yahoo returned an error: {chart['error']}")
    results = chart.get("result") or []
    if not results:
        raise SystemExit(f"{symbol}: no result in chart payload")

    result = results[0]
    meta = result.get("meta") or {}
    quote = (result.get("indicators") or {}).get("quote") or [{}]
    closes = quote[0].get("close") or []

    # Yahoo pads gaps (holidays, halted sessions) with null. Dropping them is right: a null is
    # "no trade", not "price zero", and a zero close would make a log return infinite.
    cleaned = [float(c) for c in closes if c is not None]
    if len(cleaned) < 3:
        raise SystemExit(f"{symbol}: only {len(cleaned)} usable closes, need at least 3")

    return {
        "source": url,
        "provider": "Yahoo Finance chart API",
        "symbol": symbol,
        "exchange": meta.get("fullExchangeName"),
        "currency": meta.get("currency"),
        "interval": "1d",
        "range": rng,
        "fetchedAtUtc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "closeCount": len(cleaned),
        "firstClose": cleaned[0],
        "lastClose": cleaned[-1],
        "closes": cleaned,
        # Oldest to newest, which is the order the engine's log-return loop expects.
        "prices": cleaned,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Fetch daily closes into vol-engine price-history JSON")
    ap.add_argument("--symbols", default=DEFAULT_SYMBOLS, help=f"comma-separated (default {DEFAULT_SYMBOLS})")
    ap.add_argument("--range", default=DEFAULT_RANGE, help=f"Yahoo range (default {DEFAULT_RANGE})")
    ap.add_argument("--out", default="data", help="output directory (default data/)")
    args = ap.parse_args(argv)

    symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    failures = 0
    for sym in symbols:
        try:
            doc = fetch(sym, args.range)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as exc:
            print(f"{sym}: FETCH FAILED {exc}", file=sys.stderr)
            failures += 1
            continue
        path = out_dir / f"{sym.lower()}_daily.json"
        path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
        print(
            f"{sym}: {doc['closeCount']} closes, "
            f"{doc['firstClose']:.2f} -> {doc['lastClose']:.2f}, "
            f"{path}"
        )

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
