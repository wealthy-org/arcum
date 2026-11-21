"""
On-chain publisher for `VolOracle.postMany` on Robinhood Chain.

Why this module exists
----------------------
`signer.py` in this package builds an EIP-712 `VolReading{stock, sigmaBps, skewK, nonce, expiresAt}` and signs it.
`VolOracle.sol` accepts no such signature. Its write surface is:

    post(address stock, VolReading calldata reading)        // onlyPublisher
    postMany(address[] stocks, VolReading[] readings)       // onlyPublisher

authorised by an `isPublisher` allow-list, not by `ecrecover`. There is no nonce, no `expiresAt`, no
`verifyingContract` domain. `signer.py` therefore produces signatures nothing on chain can consume, and any keeper
built on it cannot post a single reading. `signer.py` is kept only because `tests/test_signer.py` covers it; treat it
as unused and do not build a poster on top of it.

This module is the real path: build the `postMany` calldata from the Solidity struct layout, sign the transaction
locally with the publisher key, and send it over plain JSON-RPC. It deliberately depends only on `eth-account` (already
a declared dependency) and the Python standard library, so the poster has no `web3` install to drift.

Solidity struct being encoded (src/libs/OptionTypes.sol):

    struct VolReading {
        uint64 sigmaBps;      // composite IV in bps, skew and event bumps already folded in
        uint64 skewK;
        uint64 eventBumpBps;
        uint64 buyBlockFrom;  // earnings blackout window start, unix seconds (0 = none)
        uint64 buyBlockTo;
        uint64 validUntil;
        bool   stale;         // ignored on write; the oracle sets it from block.timestamp
    }

Bounds the oracle enforces, which this module pre-checks so a bad reading fails before it costs gas:
    - `stock` must be configured (`StockNotConfigured`)
    - `minSigmaBps <= sigmaBps <= maxSigmaBps` (`SigmaOutOfBounds`)
    - `validUntil > now` and `validUntil >= now + minTtl` (`ValidUntilInPast`, `TtlTooShort`)
    - `validUntil <= now + maxAge` (`HorizonTooLong`)
    - `skewK <= 10_000`, `eventBumpBps <= 20_000`
    - `buyBlockFrom == 0 || buyBlockTo >= buyBlockFrom`
    - at most `MAX_BATCH` entries per call
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple

from eth_account import Account
from eth_account.datastructures import SignedTransaction
from eth_utils import keccak, to_checksum_address

# ---------------------------------------------------------------------------------------------------- ABI encoding

# keccak256("postMany(address[],(uint64,uint64,uint64,uint64,uint64,uint64,bool)[])")[:4]
#
# Canonical signature note: the second parameter is an ARRAY of tuples, so the tuple type carries the trailing `[]`.
# Dropping it yields 0xe0dba2fa, which no contract dispatches to. Verified two ways:
#   python -c "from eth_utils import keccak; print(keccak(text='postMany(address[],(uint64,uint64,uint64,uint64,uint64,uint64,bool)[])')[:4].hex())"
#   forge script printing abi.encodeCall(IVolOracle.postMany, (stocks, readings))  -> 0x10dcfe73...
# The encoded body has been diffed byte-for-byte against that Solidity output.
POST_MANY_SELECTOR = "0x10dcfe73"

# Read-only helpers this module needs, kept as literal selectors so the module has no build step.
SELECTOR_SIGMA_FOR = "0x" + keccak(text="sigmaFor(address)")[:4].hex()
SELECTOR_IS_PUBLISHER = "0x" + keccak(text="isPublisher(address)")[:4].hex()
SELECTOR_CONFIG = "0x" + keccak(text="config(address)")[:4].hex()

WORD = 32


def _word(value: int) -> bytes:
    if value < 0:
        raise ValueError(f"cannot ABI-encode a negative uint: {value}")
    return value.to_bytes(WORD, "big")


def _address_word(addr: str) -> bytes:
    raw = bytes.fromhex(_normalise_address(addr)[2:])
    return b"\x00" * (WORD - len(raw)) + raw


def _normalise_address(addr: str) -> str:
    a = addr.strip().lower()
    if not a.startswith("0x"):
        a = "0x" + a
    if len(a) != 42:
        raise ValueError(f"not an address: {addr!r}")
    int(a, 16)  # raises on non-hex
    return a


def _checksum_address(addr: str) -> str:
    """EIP-55 form. `eth_account` refuses to sign a transaction whose `to` is all lower case
    (`Transaction had invalid fields`), while ABI encoding is happy either way, so the two paths
    need different spellings of the same address."""
    return to_checksum_address(_normalise_address(addr))


def _bool_word(value: bool) -> bytes:
    return _word(1 if value else 0)


@dataclass(frozen=True)
class VolReading:
    """Mirror of the Solidity `VolReading` struct, in declaration order."""

    sigma_bps: int
    skew_k: int = 0
    event_bump_bps: int = 0
    buy_block_from: int = 0
    buy_block_to: int = 0
    valid_until: int = 0
    stale: bool = False

    def encode(self) -> bytes:
        return b"".join(
            [
                _word(self.sigma_bps),
                _word(self.skew_k),
                _word(self.event_bump_bps),
                _word(self.buy_block_from),
                _word(self.buy_block_to),
                _word(self.valid_until),
                _bool_word(self.stale),
            ]
        )


def encode_post_many(stocks: Sequence[str], readings: Sequence[VolReading]) -> str:
    """ABI-encode `postMany(address[],VolReading[])` calldata.

    `VolReading[]` is an array of static structs, so the encoding is a dynamic array of 7-word tuples. The head is
    two offsets, then each array's length followed by its elements. No trailing dynamic members exist, so no tail
    padding is needed.
    """
    if len(stocks) != len(readings):
        raise ValueError(f"stocks/readings length mismatch: {len(stocks)} != {len(readings)}")
    if not stocks:
        raise ValueError("refusing to encode an empty postMany")

    n = len(stocks)

    # Head: offset to the addresses array, offset to the readings array.
    addresses_offset = 2 * WORD
    readings_offset = addresses_offset + WORD + n * WORD

    addresses_blob = _word(n) + b"".join(_address_word(s) for s in stocks)
    readings_blob = _word(n) + b"".join(r.encode() for r in readings)

    body = _word(addresses_offset) + _word(readings_offset) + addresses_blob + readings_blob
    return POST_MANY_SELECTOR + body.hex()


def decode_sigma_for(result_hex: str) -> Tuple[int, bool]:
    """Decode `sigmaFor(address)` -> (sigmaBps, ok)."""
    raw = bytes.fromhex(result_hex[2:] if result_hex.startswith("0x") else result_hex)
    if len(raw) < 2 * WORD:
        raise ValueError(f"short sigmaFor result: {result_hex!r}")
    sigma = int.from_bytes(raw[0:WORD], "big")
    ok = int.from_bytes(raw[WORD : 2 * WORD], "big") != 0
    return sigma, ok


def decode_vol_config(result_hex: str) -> Dict[str, Any]:
    """Decode `config(address)` -> VolConfig{minSigmaBps,maxSigmaBps,maxAge,minTtl,enabled}."""
    raw = bytes.fromhex(result_hex[2:] if result_hex.startswith("0x") else result_hex)
    if len(raw) < 5 * WORD:
        raise ValueError(f"short config result: {result_hex!r}")
    return {
        "min_sigma_bps": int.from_bytes(raw[0 * WORD : 1 * WORD], "big"),
        "max_sigma_bps": int.from_bytes(raw[1 * WORD : 2 * WORD], "big"),
        "max_age": int.from_bytes(raw[2 * WORD : 3 * WORD], "big"),
        "min_ttl": int.from_bytes(raw[3 * WORD : 4 * WORD], "big"),
        "enabled": int.from_bytes(raw[4 * WORD : 5 * WORD], "big") != 0,
    }


# ---------------------------------------------------------------------------------------------------- RPC client


class RpcError(RuntimeError):
    pass

# Some public endpoints (including Robinhood Chain's testnet RPC) reject requests that carry no
# User-Agent with `HTTP Error 403: Forbidden`. urllib sends none by default, so every call looked
# like a transport failure until this header was added. It identifies the client honestly.
RPC_USER_AGENT = "arcum-vol-publisher/1.0 (+python-urllib)"


class JsonRpc:
    """Minimal JSON-RPC 2.0 client. Fails loudly; a keeper that cannot tell whether it posted is worse than one that
    stops."""

    def __init__(self, url: str, timeout: float = 30.0) -> None:
        self.url = url
        self.timeout = timeout
        self._id = 0

    def call(self, method: str, params: List[Any]) -> Any:
        self._id += 1
        payload = json.dumps({"jsonrpc": "2.0", "id": self._id, "method": method, "params": params}).encode()
        req = urllib.request.Request(
            self.url,
            data=payload,
            headers={"content-type": "application/json", "user-agent": RPC_USER_AGENT},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                body = json.loads(resp.read().decode())
        except urllib.error.URLError as exc:
            raise RpcError(f"{method} transport failure: {exc}") from exc
        if "error" in body:
            raise RpcError(f"{method} failed: {body['error']}")
        return body.get("result")

    # -- convenience -------------------------------------------------------------------------------

    def eth_call(self, to: str, data: str) -> str:
        return self.call("eth_call", [{"to": _normalise_address(to), "data": data}, "latest"])

    def chain_id(self) -> int:
        return int(self.call("eth_chainId", []), 16)

    def block_number(self) -> int:
        return int(self.call("eth_blockNumber", []), 16)

    def gas_price(self) -> int:
        # Add 20% buffer above the network base fee so the tx is not rejected
        # when baseFee ticks up between estimation and broadcast (RPC relay lag).
        return int(int(self.call("eth_gasPrice", []), 16) * 1.2)

    def get_code(self, addr: str) -> str:
        return self.call("eth_getCode", [_normalise_address(addr), "latest"])

    def send_raw_transaction(self, raw: bytes) -> str:
        return self.call("eth_sendRawTransaction", ["0x" + raw.hex()])

    def receipt(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        return self.call("eth_getTransactionReceipt", [tx_hash])


# ---------------------------------------------------------------------------------------------------- publisher


class VolPublisherError(RuntimeError):
    pass


@dataclass
class VolPublisher:
    """Posts `VolReading`s to `VolOracle` from a publisher key.

    Usage:
        pub = VolPublisher.from_env()
        pub.preflight(["NVDA", "AAPL", "QQQ"], stock_addresses={"NVDA": "0x...", ...})
        tx = pub.post_many(stocks, readings)
    """

    rpc: JsonRpc
    oracle: str
    account: Any
    chain_id: int
    gas_limit: int = 400_000
    wait_timeout: float = 120.0
    wait_poll: float = 1.5
    _max_batch: int = field(default=32, init=False)  # VolOracle.MAX_BATCH

    # -- construction ------------------------------------------------------------------------------

    @classmethod
    def from_env(cls, env: Optional[Dict[str, str]] = None) -> "VolPublisher":
        e = os.environ if env is None else env
        rpc_url = e.get("VOL_ENGINE_RPC") or e.get("RH_RPC")
        oracle = e.get("VOL_ORACLE_ADDRESS")
        key = e.get("VOL_PUBLISHER_PRIVATE_KEY") or e.get("KEEPER_PRIVATE_KEY")

        missing = [
            name
            for name, value in (
                ("VOL_ENGINE_RPC (or RH_RPC)", rpc_url),
                ("VOL_ORACLE_ADDRESS", oracle),
                ("VOL_PUBLISHER_PRIVATE_KEY (or KEEPER_PRIVATE_KEY)", key),
            )
            if not value
        ]
        if missing:
            # Fail closed. A poster that silently starts without a key looks healthy and posts nothing.
            raise VolPublisherError("missing required env: " + ", ".join(missing))

        assert rpc_url is not None and oracle is not None and key is not None
        rpc = JsonRpc(rpc_url)
        account = Account.from_key(key)
        chain_id = rpc.chain_id()
        return cls(rpc=rpc, oracle=_normalise_address(oracle), account=account, chain_id=chain_id)

    @property
    def address(self) -> str:
        return self.account.address

    # -- preflight ---------------------------------------------------------------------------------

    def is_publisher(self) -> bool:
        result = self.rpc.eth_call(self.oracle, SELECTOR_IS_PUBLISHER + _address_word(self.address).hex())
        return int(result, 16) != 0

    def vol_config(self, stock: str) -> Dict[str, Any]:
        result = self.rpc.eth_call(self.oracle, SELECTOR_CONFIG + _address_word(stock).hex())
        return decode_vol_config(result)

    def current_sigma(self, stock: str) -> Tuple[int, bool]:
        result = self.rpc.eth_call(self.oracle, SELECTOR_SIGMA_FOR + _address_word(stock).hex())
        return decode_sigma_for(result)

    def preflight(self, symbols: Sequence[str], stock_addresses: Dict[str, str]) -> Dict[str, Dict[str, Any]]:
        """Refuse to run against a misconfigured oracle instead of discovering it one reverted tx at a time."""
        if self.rpc.get_code(self.oracle) in ("0x", "0x0", ""):
            raise VolPublisherError(f"VOL_ORACLE_ADDRESS {self.oracle} has no code on chain {self.chain_id}")
        if not self.is_publisher():
            raise VolPublisherError(
                f"{self.address} is not an authorised publisher on {self.oracle}; "
                f"the owner must call setPublisher({self.address}, true)"
            )

        configs: Dict[str, Dict[str, Any]] = {}
        problems: List[str] = []
        for sym in symbols:
            addr = stock_addresses.get(sym)
            if not addr:
                problems.append(f"{sym}: no stock address supplied")
                continue
            cfg = self.vol_config(addr)
            configs[sym] = cfg
            if not cfg["enabled"]:
                problems.append(f"{sym} ({addr}): StockNotConfigured - call setVolConfig first")
                continue
            if cfg["min_ttl"] >= cfg["max_age"]:
                problems.append(
                    f"{sym}: minTtl ({cfg['min_ttl']}s) >= maxAge ({cfg['max_age']}s); no valid TTL exists"
                )
        if problems:
            raise VolPublisherError("oracle preflight failed:\n  " + "\n  ".join(problems))
        return configs

    def validate_reading(self, symbol: str, cfg: Dict[str, Any], reading: VolReading, now: int) -> None:
        """Mirror of `VolOracle._post`'s checks, so a bad reading fails here and costs no gas."""
        if not cfg["min_sigma_bps"] <= reading.sigma_bps <= cfg["max_sigma_bps"]:
            raise VolPublisherError(
                f"{symbol}: sigmaBps {reading.sigma_bps} outside "
                f"[{cfg['min_sigma_bps']}, {cfg['max_sigma_bps']}]"
            )
        if reading.valid_until <= now:
            raise VolPublisherError(f"{symbol}: validUntil {reading.valid_until} is not in the future (now {now})")
        if reading.valid_until < now + cfg["min_ttl"]:
            raise VolPublisherError(
                f"{symbol}: validUntil {reading.valid_until} < now + minTtl ({now + cfg['min_ttl']})"
            )
        if reading.valid_until > now + cfg["max_age"]:
            raise VolPublisherError(
                f"{symbol}: validUntil {reading.valid_until} > now + maxAge ({now + cfg['max_age']})"
            )
        if reading.skew_k > 10_000:
            raise VolPublisherError(f"{symbol}: skewK {reading.skew_k} > 10000")
        if reading.event_bump_bps > 20_000:
            raise VolPublisherError(f"{symbol}: eventBumpBps {reading.event_bump_bps} > 20000")
        if reading.buy_block_from != 0 and reading.buy_block_to < reading.buy_block_from:
            raise VolPublisherError(
                f"{symbol}: buyBlockTo {reading.buy_block_to} < buyBlockFrom {reading.buy_block_from}"
            )

    # -- write -------------------------------------------------------------------------------------

    def build_transaction(self, stocks: Sequence[str], readings: Sequence[VolReading]) -> Dict[str, Any]:
        data = encode_post_many(stocks, readings)
        gas_price = self.rpc.gas_price()
        nonce = int(self.rpc.call("eth_getTransactionCount", [self.address, "pending"]), 16)
        return {
            "to": _checksum_address(self.oracle),
            "data": data,
            "value": 0,
            "gas": self.gas_limit,
            "gasPrice": gas_price,
            "nonce": nonce,
            "chainId": self.chain_id,
        }

    def post_many(
        self,
        symbols: Sequence[str],
        stock_addresses: Dict[str, str],
        readings: Dict[str, VolReading],
        *,
        wait: bool = True,
    ) -> str:
        """Post one reading per symbol in a single transaction. Returns the tx hash."""
        if len(symbols) > self._max_batch:
            raise VolPublisherError(f"{len(symbols)} symbols exceeds MAX_BATCH {self._max_batch}")

        configs = self.preflight(symbols, stock_addresses)
        now = int(time.time())

        stocks: List[str] = []
        encoded: List[VolReading] = []
        for sym in symbols:
            reading = readings.get(sym)
            if reading is None:
                raise VolPublisherError(f"{sym}: no reading supplied")
            self.validate_reading(sym, configs[sym], reading, now)
            stocks.append(_normalise_address(stock_addresses[sym]))
            encoded.append(reading)

        tx = self.build_transaction(stocks, encoded)
        signed: SignedTransaction = self.account.sign_transaction(tx)
        raw = signed.raw_transaction if hasattr(signed, "raw_transaction") else signed.rawTransaction

        tx_hash = self.rpc.send_raw_transaction(raw)
        if wait:
            self.wait_for_receipt(tx_hash)
        return tx_hash

    def wait_for_receipt(self, tx_hash: str) -> Dict[str, Any]:
        deadline = time.time() + self.wait_timeout
        while time.time() < deadline:
            rcpt = self.rpc.receipt(tx_hash)
            if rcpt is not None:
                if int(rcpt.get("status", "0x0"), 16) != 1:
                    raise VolPublisherError(f"tx {tx_hash} reverted (status 0)")
                return rcpt
            time.sleep(self.wait_poll)
        # A timeout is NOT success. Say so instead of pretending the reading landed.
        raise VolPublisherError(
            f"tx {tx_hash} not mined within {self.wait_timeout}s; check the explorer before re-posting"
        )
