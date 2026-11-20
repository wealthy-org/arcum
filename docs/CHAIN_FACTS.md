# Robinhood Chain Mainnet — Verified On-Chain Facts (Arcum)

**Chain ID:** `4663` · **RPC:** `https://rpc.mainnet.chain.robinhood.com` · **Explorer:** `https://robinhoodchain.blockscout.com`
**Verified at:** 2026-11-17 (block era `latestRoundData().updatedAt` ≈ `1794933xxx`); feed freshness re-measured 2026-11-20 at head ts `1795160359`
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

> ⚠️ **Jangan memakai angka `86400s heartbeat` sebagai dasar `maxAge`.** Diukur pada 2026-11-20 (head ts `1795160359`, 02:39 ET, pasar tutup): NVDA 9197 s, AAPL 8819 s, QQQ **648 s**. Feed QQQ ter-update di antara dua sampel, jadi feed hidup dan update-nya tidak mengikuti ritme 24 jam selama pasar tutup. Heartbeat 86400 s adalah **batas atas jaminan Chainlink**, bukan kadens nyata — memakai 86400 sebagai `maxAge` berarti menganggap harga 24 jam masih layak ditransaksikan. Lihat hazard `MAX_AGE_REGULAR=90000` di `docs/MAINNET_READINESS.md` §2.

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

## 5. Still missing for production (updated 2026-11-20)

1. **Owner wallet** that has never been exposed — Safe / multisig. The current `.env` key/address is compromised and is refused for production use. `.env.production`'s `PRIVATE_KEY` and `OWNER_ADDRESS` are now blanked.
2. **Written production sign-off** (asset list = NVDA/AAPL/QQQ, exposure caps, pause authority).
3. **Source verification** on Blockscout (API blocked by Cloudflare; needs manual browser upload).
4. ~~**TWAP cross-check** enabled only if a real Uniswap V3 pool exists for `USDG/stock` on 4663~~ — **diganti.** `KeeperTwapReference` (ring buffer 64 observasi, TWA trapesium) adalah sumber cross-check TWAP kita; ia merata-ratakan **harga yang kita posting**, bukan harga trade dari pool. `TWAP_REFERENCE` (pool V3) tetap kosong karena pool berlikuiditas nyata belum ada, dan pool buatan sendiri = harga yang mereferensi dirinya sendiri. Label user-facing: **"keeper TWAP"**, jangan "market TWAP".
5. **Timelock, VolOracle, ERC-4337, admin handover** — **sudah dieksekusi on-chain di `46630`** pada 2026-11-20 (tx `0x3060efd8…f331dc`): timelock `0x249ACeb7…9E6b` dengan `getMinDelay() = 172800`, VolOracle `0x09f2B032…6B81`, `KeeperTwapReference` `0xAC66B9cb…2FCF`, factory `0xC476074a…c3ee`, paymaster `0xe9E30Cc7…1Cb7`; VolOracle/TWAP/paymaster owner = timelock, `pendingOwner = 0`. **Di `4663` belum ada sama sekali.** Lihat `docs/MAINNET_READINESS.md` §1 dan §4.

## 6. Kontrak lama `46630` — owner sudah pindah ke timelock (2026-11-20)

Kontrak staging lama dideploy dengan `Ownable` satu langkah dan owner-nya key staging yang bocor. Rotasi dieksekusi, bukan direncanakan:

| Kontrak | Address | Owner sekarang | Tx | Blok | Gas |
|---|---|---|---|---|---|
| ArcumEngine | `0x98F7B4Ae…280C` | timelock `0x249ACeb7…9E6B` | `0x3aca4f25…69f3d8` | 155914150 | 29.101 |
| PriceGuard | `0x3D541ad6…3dBe` | timelock `0x249ACeb7…9E6B` | `0x2b724b76…af2ca5` | 155914166 | 28.680 |
| SeriesRegistry | `0x9c0B29e8…a82B` | timelock `0x249ACeb7…9E6B` | `0x4d2e18cf…ee7d5a` | 155914183 | 28.776 |

Harga gas `10.000.000` wei (0,01 gwei); total biaya 0,00000086557 ETH. Ketiga receipt `status = 0x1`. Script: `contracts/script/RotateLegacyOwner.s.sol`; catatan lengkap di `deployments/46630-caveats.json` → `legacyOwnerRotation`.

**Temuan lanjutan (penting).** `writerPoolProxy 0x1F79F6D8eFB739c270Ec7957Fff0754151eF550F` tidak punya `owner()`, tapi itu bukan berarti tidak ada admin: kontraknya UUPS (`src/WriterPool.sol:51-56`) dan `_authorizeUpgrade` memakai `onlyRole(DEFAULT_ADMIN_ROLE)` (baris 777). Slot admin ERC-1967 `0xb5312768…6103` kosong — normal untuk UUPS, dan bukan bukti aman. `hasRole(0x00…00, 0x1B4Faa13…3E45)` = **true** pada 2026-11-20: key staging yang bocor masih bisa mengganti implementation pool lewat `upgradeToAndCall` dan mengambil `totalAssets` = 5.001.600.174.745 (asset `0x0953ac821a5f07a39b02ecf5faaeca0477f13986`). Perbaikannya `contracts/script/RotateLegacyPoolAdmin.s.sol`: `grantRole` ke timelock **lalu** `renounceRole` diri sendiri, diikuti `require` bahwa timelock memegang role dan signer tidak. Simulasi: 119.585 gas, 0,0000023917 ETH. Status: belum dibroadcast.

Akibatnya: `setStock`, `setMockPrice`, `setBuysPaused`, `setPool`, `setVolOracle` pada tiga kontrak itu sekarang butuh proposal + 48 jam. `accrue`/`accrueMany` **tidak** terpengaruh — keduanya tanpa modifier (`src/ArcumEngine.sol:308` dan `:322`), jadi keeper tetap berjalan tanpa role apa pun. Bukti setelah rotasi: `eth_call` `accrueMany([0x9e5770416c7ca8f49574c581cefa54347e874d0cad92e5f46d5eb5b69c1ccc5d])` dari keeper `0x20572F72…351D` ke engine mengembalikan `0x` (tidak revert). `writerPoolProxy 0x1F79F6D8…550F` tidak punya `owner()` dan tidak tercakup rotasi ini.
