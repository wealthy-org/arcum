"""
Tests for the real `VolOracle.postMany` publisher.

The critical case is `test_encoding_matches_solidity_output`: the expected calldata below was produced by Solidity
itself, via `abi.encodeCall(IVolOracle.postMany, (stocks, readings))` inside a forge script. Pinning that byte string
here means the Python encoder cannot drift from the contract without this test failing — which is exactly the failure
mode `signer.py` represents (an encoder/signer for a write path the contract does not have).

No network access is required or performed.
"""

from __future__ import annotations

import pytest
from eth_utils import keccak

from vol_engine.publisher import (
    POST_MANY_SELECTOR,
    JsonRpc,
    VolPublisher,
    VolPublisherError,
    VolReading,
    decode_sigma_for,
    decode_vol_config,
    encode_post_many,
)

# --- pinned cross-language vector ------------------------------------------------------------------------------

VECTOR_STOCKS = ["0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222"]
VECTOR_READINGS = [
    VolReading(sigma_bps=6500, skew_k=1200, event_bump_bps=300, valid_until=1795200000, stale=False),
    VolReading(
        sigma_bps=4200,
        skew_k=0,
        event_bump_bps=0,
        buy_block_from=1795100000,
        buy_block_to=1795150000,
        valid_until=1795300000,
        stale=True,
    ),
]

# Output of `abi.encodeCall(IVolOracle.postMany, (stocks, readings))` in Solidity for the two inputs above.
# Pinned as a length + keccak256 digest rather than a 1290-char literal so the assertion stays readable; both values
# were produced by the contract ABI encoder in a forge script:
#   LEN 644
#   KECCAK 0xf04290d7e163bde7ebd850893f7a1aa1636b51a8736079e05a00c93b0f2f9721
SOLIDITY_CALLDATA_LENGTH = 644
SOLIDITY_CALLDATA_KECCAK = "0xf04290d7e163bde7ebd850893f7a1aa1636b51a8736079e05a00c93b0f2f9721"


def test_encoding_matches_solidity_output() -> None:
    calldata = bytes.fromhex(encode_post_many(VECTOR_STOCKS, VECTOR_READINGS)[2:])
    assert len(calldata) == SOLIDITY_CALLDATA_LENGTH
    assert "0x" + keccak(calldata).hex() == SOLIDITY_CALLDATA_KECCAK


def test_encoding_layout_is_the_expected_abi_shape() -> None:
    """Spot-checks on the words, independent of the digest, so a digest-only pass cannot hide a layout change."""
    calldata = bytes.fromhex(encode_post_many(VECTOR_STOCKS, VECTOR_READINGS)[10:])  # drop 0x + 4-byte selector
    words = [calldata[i : i + 32] for i in range(0, len(calldata), 32)]

    assert words[0] == (64).to_bytes(32, "big")  # offset to address[]
    assert words[1] == (160).to_bytes(32, "big")  # offset to VolReading[]

    assert words[2] == (2).to_bytes(32, "big")  # address[] length
    assert words[3][12:] == bytes.fromhex(VECTOR_STOCKS[0][2:])
    assert words[4][12:] == bytes.fromhex(VECTOR_STOCKS[1][2:])

    assert words[5] == (2).to_bytes(32, "big")  # VolReading[] length
    # Reading 0: sigmaBps, skewK, eventBumpBps, buyBlockFrom, buyBlockTo, validUntil, stale
    assert [int.from_bytes(w, "big") for w in words[6:13]] == [6500, 1200, 300, 0, 0, 1795200000, 0]
    # Reading 1: the bool packs as 1, and the blackout window survives the round-trip.
    assert [int.from_bytes(w, "big") for w in words[13:20]] == [4200, 0, 0, 1795100000, 1795150000, 1795300000, 1]


def test_selector_is_the_array_of_tuples_signature() -> None:
    # Dropping the trailing `[]` gives 0xe0dba2fa, which no contract dispatches to.
    assert POST_MANY_SELECTOR == "0x10dcfe73"


def test_encoding_rejects_length_mismatch() -> None:
    with pytest.raises(ValueError, match="length mismatch"):
        encode_post_many(VECTOR_STOCKS, VECTOR_READINGS[:1])


def test_encoding_rejects_empty_batch() -> None:
    with pytest.raises(ValueError, match="empty postMany"):
        encode_post_many([], [])


def test_reading_rejects_negative_values() -> None:
    with pytest.raises(ValueError, match="negative"):
        VolReading(sigma_bps=-1).encode()


# --- decoding --------------------------------------------------------------------------------------------------


def test_decode_sigma_for() -> None:
    result = "0x" + (6500).to_bytes(32, "big").hex() + (1).to_bytes(32, "big").hex()
    assert decode_sigma_for(result) == (6500, True)


def test_decode_vol_config() -> None:
    words = [(500).to_bytes(32, "big"), (30_000).to_bytes(32, "big"), (7200).to_bytes(32, "big")]
    words += [(60).to_bytes(32, "big"), (1).to_bytes(32, "big")]
    cfg = decode_vol_config("0x" + b"".join(words).hex())
    assert cfg == {"min_sigma_bps": 500, "max_sigma_bps": 30_000, "max_age": 7200, "min_ttl": 60, "enabled": True}


def test_decode_vol_config_rejects_short_result() -> None:
    with pytest.raises(ValueError, match="short config"):
        decode_vol_config("0x" + "00" * 32)


# --- preflight / validation, exercised without a node ----------------------------------------------------------


class FakeRpc(JsonRpc):
    """Answers only the calls preflight and posting make. Records what was asked."""

    def __init__(self, configs, *, publisher=True, code="0x6001", chain_id=4663, gas_price=10**9, nonce=7):
        self.url = "fake://"
        self.timeout = 1.0
        self._id = 0
        self._configs = configs
        self._publisher = publisher
        self._code = code
        self._chain_id = chain_id
        self._gas_price = gas_price
        self._nonce = nonce
        self.sent: list = []

    def chain_id(self) -> int:
        return self._chain_id

    def gas_price(self) -> int:
        return self._gas_price

    def get_code(self, addr: str) -> str:
        return self._code

    def call(self, method, params):
        if method == "eth_getTransactionCount":
            return hex(self._nonce)
        if method == "eth_sendRawTransaction":
            self.sent.append(params[0])
            return "0x" + "ab" * 32
        raise AssertionError(f"unexpected RPC call {method}")

    def eth_call(self, to: str, data: str) -> str:
        # Route by selector so a wrong selector is a test failure, not a silent pass.
        if data.startswith("0x41859ac8"):  # isPublisher(address)
            return "0x" + (1 if self._publisher else 0).to_bytes(32, "big").hex()
        if data.startswith("0x0e68ec95"):  # config(address)
            cfg = next(iter(self._configs.values()))
            words = [
                cfg["min_sigma_bps"].to_bytes(32, "big"),
                cfg["max_sigma_bps"].to_bytes(32, "big"),
                cfg["max_age"].to_bytes(32, "big"),
                cfg["min_ttl"].to_bytes(32, "big"),
                (1 if cfg["enabled"] else 0).to_bytes(32, "big"),
            ]
            return "0x" + b"".join(words).hex()
        raise AssertionError(f"unexpected eth_call selector {data[:10]}")

    def send_raw_transaction(self, raw: bytes) -> str:
        self.sent.append("0x" + raw.hex())
        return "0x" + "cd" * 32


HEALTHY_CFG = {
    "min_sigma_bps": 500,
    "max_sigma_bps": 30_000,
    "max_age": 7200,
    "min_ttl": 60,
    "enabled": True,
}

STOCK = "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC"


def _publisher(rpc: FakeRpc) -> VolPublisher:
    # A well-known throwaway private key: anvil account 0. Never funded on any live chain.
    from eth_account import Account

    key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    return VolPublisher(rpc=rpc, oracle="0x09f2B03288A72C5B6F31B9Db19548aca42116B81", account=Account.from_key(key), chain_id=4663)


def test_preflight_rejects_non_publisher() -> None:
    pub = _publisher(FakeRpc({"NVDA": HEALTHY_CFG}, publisher=False))
    with pytest.raises(VolPublisherError, match="not an authorised publisher"):
        pub.preflight(["NVDA"], {"NVDA": STOCK})


def test_preflight_rejects_codeless_oracle() -> None:
    pub = _publisher(FakeRpc({"NVDA": HEALTHY_CFG}, code="0x"))
    with pytest.raises(VolPublisherError, match="has no code"):
        pub.preflight(["NVDA"], {"NVDA": STOCK})


def test_preflight_rejects_disabled_stock() -> None:
    cfg = dict(HEALTHY_CFG, enabled=False)
    pub = _publisher(FakeRpc({"NVDA": cfg}))
    with pytest.raises(VolPublisherError, match="StockNotConfigured"):
        pub.preflight(["NVDA"], {"NVDA": STOCK})


def test_preflight_surfaces_every_problem_at_once() -> None:
    pub = _publisher(FakeRpc({"NVDA": HEALTHY_CFG}))
    with pytest.raises(VolPublisherError) as exc:
        pub.preflight(["NVDA", "AAPL"], {"NVDA": STOCK})
    assert "AAPL: no stock address supplied" in str(exc.value)


def test_validate_reading_mirrors_oracle_bounds() -> None:
    pub = _publisher(FakeRpc({"NVDA": HEALTHY_CFG}))
    now = 1_795_190_000

    pub.validate_reading("NVDA", HEALTHY_CFG, VolReading(sigma_bps=6500, valid_until=now + 3600), now)

    with pytest.raises(VolPublisherError, match="outside"):
        pub.validate_reading("NVDA", HEALTHY_CFG, VolReading(sigma_bps=100, valid_until=now + 3600), now)
    with pytest.raises(VolPublisherError, match="not in the future"):
        pub.validate_reading("NVDA", HEALTHY_CFG, VolReading(sigma_bps=6500, valid_until=now), now)
    with pytest.raises(VolPublisherError, match="minTtl"):
        pub.validate_reading("NVDA", HEALTHY_CFG, VolReading(sigma_bps=6500, valid_until=now + 30), now)
    with pytest.raises(VolPublisherError, match="maxAge"):
        pub.validate_reading("NVDA", HEALTHY_CFG, VolReading(sigma_bps=6500, valid_until=now + 99_999), now)
    with pytest.raises(VolPublisherError, match="skewK"):
        pub.validate_reading("NVDA", HEALTHY_CFG, VolReading(sigma_bps=6500, skew_k=10_001, valid_until=now + 3600), now)
    with pytest.raises(VolPublisherError, match="buyBlockTo"):
        pub.validate_reading(
            "NVDA",
            HEALTHY_CFG,
            VolReading(sigma_bps=6500, buy_block_from=200, buy_block_to=100, valid_until=now + 3600),
            now,
        )


def test_post_many_signs_and_sends_the_encoded_calldata() -> None:
    rpc = FakeRpc({"NVDA": HEALTHY_CFG})
    pub = _publisher(rpc)
    now = int(__import__("time").time())
    reading = VolReading(sigma_bps=6500, valid_until=now + 3600)

    pub.post_many(["NVDA"], {"NVDA": STOCK}, {"NVDA": reading}, wait=False)

    assert len(rpc.sent) == 1
    raw = rpc.sent[0]
    assert raw.startswith("0x")
    # The signed transaction payload must carry the postMany calldata.
    assert encode_post_many([STOCK], [reading])[2:] in raw


def test_post_many_refuses_batch_larger_than_max_batch() -> None:
    pub = _publisher(FakeRpc({"NVDA": HEALTHY_CFG}))
    symbols = [f"S{i}" for i in range(33)]
    with pytest.raises(VolPublisherError, match="MAX_BATCH"):
        pub.post_many(symbols, {}, {})


def test_from_env_fails_closed_without_key(monkeypatch) -> None:
    for name in ("VOL_ENGINE_RPC", "RH_RPC", "VOL_ORACLE_ADDRESS", "VOL_PUBLISHER_PRIVATE_KEY", "KEEPER_PRIVATE_KEY"):
        monkeypatch.delenv(name, raising=False)
    with pytest.raises(VolPublisherError, match="missing required env"):
        VolPublisher.from_env({})


def test_from_env_fails_closed_without_oracle(monkeypatch) -> None:
    with pytest.raises(VolPublisherError, match="VOL_ORACLE_ADDRESS"):
        VolPublisher.from_env(
            {
                "VOL_ENGINE_RPC": "https://rpc.mainnet.chain.robinhood.com",
                "VOL_PUBLISHER_PRIVATE_KEY": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
            }
        )
