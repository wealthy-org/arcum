# Robinhood Chain Mainnet — Verified On-Chain Facts (Arcum)

**Chain ID:** `4663` · **RPC:** `https://rpc.mainnet.chain.robinhood.com` · **Explorer:** `https://robinhoodchain.blockscout.com`
**Verified at:** 2026-11-17 (block era `latestRoundData().updatedAt` ≈ `1794933xxx`)
**Method:** every address below was read directly from the chain with `cast` (not copied from chat, token lists, or marketing pages).

> Re-verify before any production deploy. Stale documentation is a security bug.

---

## 1. Settlement token — USDG (Global Dollar) ✅

| Field | Value |
|---|---|
| Address | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| `symbol()` | `USDG` |
| `name()` | `Global Dollar` |
| `decimals()` | `6` |
| `totalSupply()` | `627345706483127` (= 627,345,706.48 USDG) |
| `code.length` | non-zero |

This is the **real** settlement asset. The mainnet staging deployment (`deployments/4663.json`) still uses `MockUSDG 0x2d97243c649e0ccbae64155391472c323856bf13` (`decimals` 6, publicly mintable) — that is demo-only and must never hold real value.

```bash
cast call 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 'symbol()(string)'   --rpc-url $RPC   # "USDG"
cast call 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 'decimals()(uint8)'  --rpc-url $RPC   # 6
```

## 2. Stock tokens ✅

All five tokens exist on chain 4663, are 18-decimal ERC20s, and expose `uiMultiplier()`.

| Ticker | Token address | `symbol()` | `decimals()` |
|---|---|---|---|
| NVDA | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` | `NVDA` | 18 |
| TSLA | `0x322F0929c4625eD5bAd873c95208D54E1c003b2d` | `TSLA` | 18 |
| SPY  | `0x117cc2133c37B721F49dE2A7a74833232B3B4C0C` | `SPY`  | 18 |
| QQQ  | `0xD5f3879160bc7c32ebb4dC785F8a4F505888de68` | `QQQ`  | 18 |
| AAPL | `0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9` | `AAPL` | 18 |

The stock token contracts themselves expose **no** price function (`price()`, `oracle()`, `latestRoundData()` all revert). Prices only come from the Chainlink feeds below.

## 3. Chainlink price feeds (AggregatorV3) — partial coverage ⚠️

Chainlink is the official oracle for Robinhood Chain. Feed parameters published by Chainlink for these equities: **8 decimals**, **0.5% deviation**, **86400s heartbeat**, market hours `us_equities_24/5`.

| Ticker | Feed (Standard Proxy) | `description()` | `decimals()` | Verified reading |
|---|---|---|---|---|
| NVDA | `0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15` | `RHNVDA / USD` | 8 | `15378411483` = $153.78411483 |
| AAPL | `0x6B22A786bAa607d76728168703a39Ea9C99f2cD0` | `Robinhood AAPL / USD` | 8 | `35215815123` = $352.15815123 |
| QQQ  | `0x80901d846d5D7B030F26B480776EE3b29374C2ae` | `Robinhood QQQ / USD` | 8 | `65245191238` = $652.4519124 |
| TSLA | **NOT LISTED** | — | — | no Chainlink feed on 4663 yet |
| SPY  | **NOT LISTED** | — | — | no Chainlink feed on 4663 yet |

```bash
cast call $FEED 'description()(string)' --rpc-url $RPC
cast call $FEED 'latestRoundData()(uint80,int256,uint256,uint256,uint80)' --rpc-url $RPC
```

**Consequence for Arcum:** production can launch only `NVDA`, `AAPL`, `QQQ`. TSLA and SPY series exist in the staging/demo config and **must be excluded** from a production launch until Chainlink lists feeds for them.

### Multiplier semantics (important)
Stock-token feeds already include the corporate-action multiplier: `feedPrice = sharePrice × uiMultiplier / 1e18`
(`AAPL` feed $352.158 / `uiMultiplier` 1.00109 = $351.77 underlying share price).

Therefore `IPriceGuard.StockConfig.multiplierEmbedded` **must stay `true`** and the engine must not apply `uiMultiplier` a second time.

### L2 sequencer uptime feed
`PriceGuardProd` does not read a sequencer uptime feed. Worth noting: the Robinhood Chain price-feeds registry lists **no** L2 Sequencer Uptime Feed for chain 4663 (searched), so there is nothing to wire today. Freshness is enforced via heartbeat-based `maxAge`, not sequencer status. Revisit if Chainlink publishes one.

## 4. Production preflight result (no mocks, real chain state)

`script/DeployProduction.s.sol` executed with `DRY_RUN=true` against the real mainnet RPC:

```
=== Arcum production deploy preflight ===
chainId        : 4663
USDG           : 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
USDG decimals  : 6
stocks         : 3
stock NVDA / feed NVDA 0x379EC4...9F15
stock AAPL / feed AAPL 0x6B22A7...2cD0
stock QQQ  / feed QQQ  0x80901d...C2ae
WARNING: no TWAP_REFERENCE configured; the TWAP band cross-check stays disabled.
DRY_RUN=true: inputs valid, nothing deployed.
```

Every input was validated on-chain: code present, `decimals` supported, `latestRoundData()` answering, round complete, price > 0.

## 5. Still missing for production (unchanged)

1. **Owner wallet** that has never been exposed — Safe / multisig. The current `.env` key/address is compromised and is refused for production use.
2. **Written production sign-off** (asset list = NVDA/AAPL/QQQ, exposure caps, pause authority).
3. **Source verification** on Blockscout (API blocked by Cloudflare; needs manual browser upload).
4. **TWAP cross-check** enabled only if a real Uniswap V3 pool exists for `USDG/stock` on 4663 (not verified).
