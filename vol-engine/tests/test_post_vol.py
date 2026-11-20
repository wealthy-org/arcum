"""
Tests for the `post_vol.py` CLI wiring: banding, the 25% per-update shift limit, and fail-closed argument handling.

The point of these tests is that a keeper which invents data or posts an out-of-band sigma is worse than a keeper that
refuses to start, so both refusals are asserted rather than assumed.
"""

from __future__ import annotations

import json

import pytest

from post_vol import compose_reading, load_prices, main

NOW = 1_795_190_000


def _reading(sigma_bps: int, previous=None, ttl=3600):
    return compose_reading(
        sigma_bps=sigma_bps,
        previous_sigma_bps=previous,
        ttl_seconds=ttl,
        skew_k=0,
        event_bump_bps=0,
        buy_block_from=0,
        buy_block_to=0,
        now=NOW,
    )


def test_compose_sets_valid_until_from_ttl() -> None:
    assert _reading(6500, ttl=3600).valid_until == NOW + 3600


def test_compose_never_posts_a_stale_flag() -> None:
    # The oracle derives `stale` from block.timestamp; a poster that sets it is lying about freshness.
    assert _reading(6500).stale is False


def test_compose_clamps_into_engine_band() -> None:
    assert _reading(1).sigma_bps == 2000  # MIN_SIGMA_BPS floor
    assert _reading(99_999).sigma_bps == 20_000  # MAX_SIGMA_BPS cap


def test_compose_applies_twenty_five_percent_shift_limit() -> None:
    assert _reading(9000, previous=6000).sigma_bps == 7500  # +25% ceiling
    assert _reading(3000, previous=6000).sigma_bps == 4500  # -25% floor
    # A modest move passes untouched.
    assert _reading(6500, previous=6000).sigma_bps == 6500


def test_load_prices_accepts_array_and_object(tmp_path) -> None:
    arr = tmp_path / "arr.json"
    arr.write_text(json.dumps([100.0, 101.0, 102.5]))
    assert load_prices(f"NVDA={arr}") == [100.0, 101.0, 102.5]

    obj = tmp_path / "obj.json"
    obj.write_text(json.dumps({"prices": [1, 2, 3]}))
    assert load_prices(f"NVDA={obj}") == [1.0, 2.0, 3.0]


def test_load_prices_rejects_too_short_history(tmp_path) -> None:
    p = tmp_path / "short.json"
    p.write_text(json.dumps([100.0, 101.0]))
    with pytest.raises(SystemExit, match="at least 3 prices"):
        load_prices(f"NVDA={p}")


def test_load_prices_rejects_malformed_spec() -> None:
    with pytest.raises(SystemExit, match="SYMBOL=path"):
        load_prices("no-equals-sign.json")


def test_cli_refuses_without_stock_address(monkeypatch, tmp_path, capsys) -> None:
    monkeypatch.delenv("STOCK_NVDA", raising=False)
    prices = tmp_path / "p.json"
    prices.write_text(json.dumps([100.0, 101.0, 102.0]))
    # A missing stock address aborts before any RPC call, with a non-zero exit, not a silent skip.
    with pytest.raises(SystemExit, match="STOCK_NVDA"):
        main(["--symbols", "NVDA", "--prices", f"NVDA={prices}"])


def test_cli_fails_closed_without_publisher_key(monkeypatch) -> None:
    for name in ("VOL_ENGINE_RPC", "RH_RPC", "VOL_ORACLE_ADDRESS", "VOL_PUBLISHER_PRIVATE_KEY", "KEEPER_PRIVATE_KEY"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("STOCK_NVDA", "0xd0601CE157Db5bdC3162BbaC2a2C8aF5322D9EEC")
    rc = main(["--symbols", "NVDA"])
    assert rc == 2
