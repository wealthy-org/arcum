# Arcum Volatility Engine

Realized volatility calculation, strike skew modeling, and **on-chain posting to `VolOracle`** for Robinhood Chain
stock options.

## Where the readings go

`VolOracle.sol` accepts readings from allow-listed publisher addresses. Its write surface is:

```solidity
function post(address stock, VolReading calldata reading) external;      // onlyPublisher
function postMany(address[] calldata stocks, VolReading[] calldata readings) external; // onlyPublisher
```

There is no signature, no nonce, no `expiresAt`, and no EIP-712 domain. Authorisation is `isPublisher(msg.sender)`,
granted by the oracle owner via `setPublisher(account, true)`.

The shipped poster is therefore `vol_engine.publisher.VolPublisher` / `post_vol.py`, which encodes `postMany` calldata
against the Solidity struct and sends a real transaction from the publisher key.

`vol_engine/signer.py` builds an EIP-712 signature for a `VolReading` shape this oracle does not have. **Nothing on
chain can consume that signature.** It is deprecated and kept only because `tests/test_signer.py` still covers it;
delete both together.

## Usage

```bash
# 1. Wire the publisher (owner does this once, per oracle)
cast send $VOL_ORACLE_ADDRESS "setPublisher(address,bool)" $PUBLISHER_ADDRESS true --rpc-url $RPC --private-key $OWNER_KEY

# 2. Configure the stock so the oracle will accept readings for it
cast send $VOL_ORACLE_ADDRESS "setVolConfig(address,(uint64,uint64,uint32,uint32,bool))" \
  $STOCK_NVDA "(500,30000,7200,60,true)" --rpc-url $RPC --private-key $OWNER_KEY

# 3. Post readings
export VOL_ENGINE_RPC=$RPC
export VOL_ORACLE_ADDRESS=0x...
export VOL_PUBLISHER_PRIVATE_KEY=0x...
export STOCK_NVDA=0x...
python post_vol.py --symbols NVDA --prices NVDA=./data/nvda.json --ttl 3600 --dry-run
python post_vol.py --symbols NVDA --prices NVDA=./data/nvda.json --ttl 3600
```

`--prices` takes `SYMBOL=path.json`, where the file holds either a JSON array of prices or `{"prices": [...]}`. At
least three prices are required. **Without price history the CLI refuses to run** rather than inventing a number: an
invented volatility prices every option on the book against fiction, and the on-chain guard has no way to detect it.

### Where the price history comes from

`fetch_prices.py` builds those files from real daily closes:

```bash
python fetch_prices.py                        # NVDA,AAPL,QQQ, range 1y
python fetch_prices.py --range 6mo --symbols NVDA --out data/2026-11-20
```

Source: Yahoo Finance chart endpoint (`/v8/finance/chart/<SYM>?range=1y&interval=1d`). It returns the exchange's own
daily closes; no API key, no derived or interpolated series. Gaps (holidays, halted sessions) arrive as `null` and are
dropped — a `null` is "no trade", not "price zero", and a zero close would make a log return infinite.

Each output file records where it came from so a reading can be audited after the fact:

```json
{
  "source": "https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=1y&interval=1d",
  "provider": "Yahoo Finance chart API",
  "symbol": "NVDA",
  "fetchedAtUtc": "2026-11-20T13:44:02+00:00",
  "closeCount": 251,
  "firstClose": 180.64,
  "lastClose": 145.98,
  "closes": [ ... ],
  "prices": [ ... ]
}
```

### Running it unattended

`publish_once.py` is the scheduled entry point: it loads `app/.env` (gitignored — the publisher key is never
stored here), refreshes the price files, then posts. Exit code is non-zero and the oracle is left untouched if any
step fails.

```bash
python publish_once.py --dry-run    # fetch + compute + encode, send nothing
python publish_once.py              # real post
```

`ops/install-vol-task.ps1` registers it with Windows Task Scheduler as `ArcumVol`, every 30 minutes, logging to
`app/logs/vol.log`. Every 30 minutes rather than hourly because a reading is only valid for its TTL (3600 s): one
failed cycle would otherwise mean an hour of `StaleVol` reverts on every new buy.

Reference run on Robinhood Chain testnet `46630`, 2026-11-20: NVDA 3885 bps (38,85%), AAPL 2500 bps (25,00%),
QQQ 2167 bps (21,67%), posted in one transaction (`0x8091d5e7…d439`, gas 187.395) by publisher
`0x20572F72…351D`; `VolOracle.sigmaFor()` then returned `(3885,true)`, `(2500,true)`, `(2167,true)`.

The CLI pre-checks every reading against the live `VolConfig` (`sigmaBps` band, `validUntil` bounds, `skewK` and
`eventBumpBps` caps, blackout window ordering) before encoding, so a bad reading fails before it costs gas. It also
refuses to start when the publisher key is missing or the address is not an authorised publisher — a keeper that
starts without credentials looks healthy and posts nothing.

## Library

```python
from vol_engine.publisher import VolPublisher, VolReading

pub = VolPublisher.from_env()
pub.preflight(["NVDA"], {"NVDA": "0xd0601CE157Db5bdC3162BbaC2a2C8aF5322D9EEC"})
tx = pub.post_many(
    ["NVDA"],
    {"NVDA": "0xd0601CE157Db5bdC3162BbaC2a2C8aF5322D9EEC"},
    {"NVDA": VolReading(sigma_bps=6500, valid_until=int(time.time()) + 3600)},
)
```

Dependencies are `eth-account` plus the standard library only; no `web3` install to drift.

## Tests

```bash
python -m pytest tests/ -q
```

`tests/test_publisher.py::test_encoding_matches_solidity_output` pins the `postMany` calldata length and keccak digest
against values emitted by the contract ABI encoder itself (`abi.encodeCall(IVolOracle.postMany, ...)` in a forge
script), so the Python encoder cannot drift from the Solidity struct without this suite failing. That is exactly the
drift `signer.py` represents, so the check is the point.
