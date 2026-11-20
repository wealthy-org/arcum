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
