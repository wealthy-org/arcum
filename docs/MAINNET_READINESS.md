# Arcum — Mainnet Readiness Status

**Diperbarui:** 2026-11-20
**Target:** Robinhood Chain mainnet, chainId `4663`, settlement USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (6 dp)
**Produk live saat ini:** testnet `46630`

## Verdict jujur

**Belum ada deploy produksi Arcum di `4663`.** Yang ada di `4663` adalah stack staging demo (`deployments/4663.json`, `MockUSDG` + mock PriceGuard) dan itu **bukan** rilis produksi.

Tapi klaim yang dulu ditulis di dokumen-dokumen tim — *"feed NVDA belum ada"*, *"harga saham masih diketik owner"*, *"IV hardcode 50%"* — **sudah tidak benar** per kode sekarang. Kabel oracle yang dulu disebut sebagai satu-satunya pemisah antara kode ini dan mainnet **sudah tersambung, dan sekarang diverifikasi langsung terhadap mainnet asli oleh test fork**, bukan oleh manifest atau pesan chat.

Yang benar-benar tersisa bukan kode: key deploy bersih, Safe yang bisa tanda tangan, dana gas, satu putaran audit.

---

## 1. Kebutuhan mainnet — sudah atau belum

Status: `SIAP` = ada dan terbukti, `BELUM` = belum ada, `TIDAK PERLU` = memang tidak dibutuhkan.

> **Batas yang harus dibaca sebelum tabel ini:** kolom `SIAP` untuk baris 2–3 berarti **kode + test**-nya ada dan lulus, bukan bahwa guard produksi sudah berjalan di `46630`. Di `46630` **tidak ada feed Chainlink** — ketiga alamat feed `0x379EC4f7…`, `0x6B22A786…`, `0x80901d84…` ber-`codesize` **0** di `46630` (hanya ada di `4663`). Karena itu guard yang aktif di `46630` adalah `PriceGuard` lama berbasis `setMockPrice` (`0x3D541ad6…3dBe`, `codesize 2691`), dan `twapCheck()` di sana mengembalikan harga mock, bukan TWAP. Konsekuensinya: `KeeperTwapReference` yang baru terpasang di `46630` belum punya sumber harga otoritatif untuk direlay, sehingga `observationCount` sengaja dibiarkan 0 — mengisinya dari harga mock berarti memalsukan TWAP.

| # | Kebutuhan | Status | Bukti |
|---|---|---|---|
| 1 | Settlement token nyata (bukan mock) | **SIAP** | `USDG 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` di 4663: `symbol() = "USDG"`, `decimals() = 6`, ada code. Diuji `test/fork/Mainnet4663.t.sol::test_fork_usdgIsTheRealSettlementToken` |
| 2 | Feed harga saham resmi (Chainlink) | **SIAP** | NVDA `0x379EC4f7…9F15` (`"RHNVDA / USD"`), AAPL `0x6B22A786…2cD0` (`"Robinhood AAPL / USD"`), QQQ `0x80901d84…C2ae` (`"Robinhood QQQ / USD"`). Semua 8 desimal, `answeredInRound == roundId`, answer positif. Diuji `test_fork_feedsDescribeTheirPair`, `test_fork_feedsAnswerCompletePositiveRounds` |
| 3 | `PriceGuard` membaca feed nyata, bukan `setMockPrice` | **SIAP** | `src/PriceGuardProd.sol`; `test/PriceGuardChainlink.t.sol` 22 test lulus (scaling 8/18/6 dp, stale/future/zero `updatedAt`, incomplete round, answer ≤ 0, feed revert → `_lastGoodPrices`, boundary `updatedAt == now - maxAge`) |
| 4 | Multiplier corporate action tidak dikalikan dua kali | **SIAP** | `multiplierEmbedded` di `IPriceGuard.StockConfig`; dikunci `test_multiplierIsNotAppliedTwice` |
| 5 | Staleness window aman | **SIAP** | `MAX_AGE_REGULAR=300`, `MAX_AGE_EXTENDED=900`, `MAX_AGE_CLOSED` = 3 hari (`PriceGuardProd.sol:42`, konstanta, tidak dikonfigurasi). `_maxAge()` di `PriceGuardProd.sol:275` memilih jendela per sesi. Script menolak nilai > 3600 lewat `_requireSaneMaxAge` + 4 test |
| 6 | Sesi bursa + DST benar | **SIAP** | `sessionAt()` (`PriceGuardProd.sol:225`); `test_session_dstSummer`, `test_session_standardTimeWinter`, `test_session_dstWouldBeWrongWithFixedOffset`, `test_session_dstBoundaries` |
| 7 | TWAP cross-check nyata (bukan stub) | **SIAP** | `src/KeeperTwapReference.sol` ring buffer 64 observasi, TWA trapesium, stale → 0, `minInterval`; 11 test lulus. Deviasi di luar band mem-pause buy (`test_twap_outsideBandPausesBuys`); TWAP tidak tersedia = pause (`test_twap_unavailablePausesBuys`) |
| 8 | IV tidak hardcode | **SIAP** | `ArcumEngine._vol()` → `VolOracle.sigmaFor()`, clamp `MIN_SIGMA_BPS`/`MAX_SIGMA_BPS`, fallback `DEFAULT_SIGMA_BPS` dengan `ok = false`. `VolOracle` 13 test lulus |
| 9 | Poster vol yang benar-benar bisa menulis | **SIAP (kode + on-chain `46630`)** | `vol-engine/vol_engine/publisher.py` + `post_vol.py`, encode `postMany` dan kirim tx dari publisher key. Encoding dikunci ke output `abi.encodeCall` Solidity (panjang 644 byte, keccak `0xf04290d7…9721`). 35 test Python lulus. **Harga historis nyata:** `vol-engine/fetch_prices.py` menarik close harian dari Yahoo Finance chart API (251 sesi per simbol, disimpan di `vol-engine/data/*_daily.json` dengan URL sumber + `fetchedAtUtc`). **On-chain 46630:** tx `0x8091d5e786212c01a10ac9846d1722cc54cf60c1d4d0df3bfb59e8ba4ecfd439`, blok 155880671, gas 187.395, dari publisher `0x20572F72…351D` |
| 10 | Timelock 48 jam | **SIAP (kode + on-chain `46630`)** | `CaveatCloser` + `CloseCaveats.s.sol`: TL di-deploy dengan `admin = address(this)`, bootstrap delay 0, lalu `updateDelay(172800)` dieksekusi **lewat timelock itu sendiri**, lalu role `address(this)` dicabut. 4 test lulus. **On-chain 46630:** `0x249ACeb7d446F5f0375e6E6b6F3b88f88e399E6b`, `getMinDelay() = 172800`, tx `0x3060efd8…f331dc` |
| 11 | VolOracle di-wire ke engine | **SIAP (kode + on-chain `46630`)** | wiring ada di `CaveatCloser` dan `DeployProduction.s.sol`. **On-chain 46630:** `0x09f2B03288A72C5B6F31B9Db19548aca42116B81`, `owner = timelock`, `pendingOwner = 0`, `config(NVDA/AAPL/QQQ) = (500, 30000, 7200, 60, true)`, `isPublisher(keeper) = true`. **Dijadwalkan:** `ArcumVol` (Windows Task Scheduler, tiap 30 menit) lewat `vol-engine/publish_once.py`; bukti run manual tx `0xdab291cc…a236`, blok 155884210, gas 76.395. **`sigmaFor()` sekarang berisi:** NVDA `(3885, true)` = 38,85%, AAPL `(2500, true)` = 25,00%, QQQ `(2167, true)` = 21,67% (tx `0x8091d5e7…d439`). Sebelumnya `(0,false)` sehingga opsi baru ditolak `StaleVol` |
| 12 | `KeeperTwapReference` terpasang di guard | **SIAP (kode + on-chain `46630`)** | `setTwapSource` dipanggil di `CaveatCloser`. **On-chain 46630:** `0xAC66B9cb14765cF581AcD28870a1117973372FCF`, `owner = timelock`, `window = 3600`, `minInterval = 300`, `isKeeper(keeper) = true`, `observationCount = 0` — **sengaja**, lihat catatan di atas tabel: guard yang berjalan di `46630` masih `PriceGuard` mock, jadi belum ada harga otoritatif untuk direlay ke TWAP |
| 13 | Stack ERC-4337 (account, factory, paymaster) | **SIAP (kode + on-chain `46630`)** | `src/aa/`: `ArcumAccount`, `ArcumAccountFactory` (CREATE2), `ArcumPaymaster` (deposit-based, `budgetOf` per akun). 8 test lulus terhadap EntryPoint v0.7 asli `0x0000000071727De22E5E9d8BAf0edAc6f37da032`. **On-chain 46630:** factory `0xC476074a0C2eC117a64E5D7516C47E807fe6c3ee`, paymaster `0xe9E30Cc7E32bd55959d8bb109aecc9344a611Cb7`, keduanya `owner = timelock`; `getAddress(0x08f4…D90B, 0) = 0x63bb9c0B3C10FC7a522fE09732e0d13A978dAd57` |
| 14 | Admin diserahkan dari deployer | **SIAP untuk `46630`** | `CaveatCloser` menyerahkan ownership kontrak baru ke `OWNER_ADDRESS`. Kontrak lama di `46630` (engine, pool, seriesRegistry, priceGuard) sudah dipindah dari key staging bocor ke timelock `0x249ACeb7…9E6B` pada 2026-11-20: tx `0x3aca4f25…69f3d8` (engine), `0x2b724b76…af2ca5` (priceGuard), `0x4d2e18cf…ee7d5a` (registry), 86.557 gas total, ketiga receipt `status = 0x1`; `owner()` ketiganya sekarang alamat timelock. Konsekuensi: aksi admin di tiga kontrak itu butuh proposal + 48 jam; `accrue`/`accrueMany` tetap permissionless. `writerPoolProxy` tidak punya `owner()` jadi tidak tercakup. Detail: `docs/CHAIN_FACTS.md` §6
| 15 | Deploy script menolak input fatal | **SIAP** | `DeployProduction.s.sol` menolak: key staging bocor, `OWNER_ADDRESS == deployer`, owner tanpa code, token/feed tanpa code, feed diam, feed harga nol, feed round tidak lengkap, `MAX_AGE_*` > 3600. 14 test lulus |
| 16 | Test fork terhadap mainnet asli | **SIAP** | `test/fork/Mainnet4663.t.sol`, 9 test, jalan ke `rpc.mainnet.chain.robinhood.com`. **Fail-closed:** RPC mati = suite GAGAL, bukan skip diam-diam (diverifikasi dengan `RH_MAINNET_RPC=http://127.0.0.1:1`) |
| 17 | Keeper terpisah dari owner | **SIAP (kode + berjalan di `46630`)** | `app/src/keeper/run.ts`: `KEEPER_PRIVATE_KEY` wajib (tidak ada fallback key hardcoded), `tick()` membaca `getMarketSession()` dan berhenti kalau sesi bukan `REGULAR`/`EXTENDED`. Migrasi per `ORACLE_CHAINLINK_ARCUM.md` §3: accrue **hanya seri dengan `totalSupply > 0`** (sebelumnya ikut meng-accrue seri kosong), interval dari `KEEPER_INTERVAL_MS` default 1 jam (sebelumnya 15 menit hardcoded), plus `KEEPER_DRY_RUN`. **On-chain 46630:** keeper `0x20572F72…351D` terisi 0,002 ETH dan sudah mengirim `accrueMany` untuk 11 seri (tx `0xe1cec46c…d67d2`, gas 643.980). Setelah filter aktif: run kedua tx `0x52b959fe…0992`, **3 seri, gas 200.199** (hemat 443.781 gas / 68,9%). **Dijadwalkan:** Windows Task Scheduler `ArcumKeeper`, tiap jam, `app/ops/install-keeper-task.ps1`; log `app/logs/keeper.log`. Diverifikasi dengan `/run` manual → log `{"action":"accrueCheck","dueCount":0}` (benar: belum 1 jam sejak accrue terakhir). Bug yang ditemukan saat verifikasi: `bun run keeper` tanpa `RUN_KEEPER_DAEMON=true` dulu tidak menjalankan `tick()` sama sekali → task terlihat sukses tapi tidak meng-accrue; sudah diperbaiki (`await tick()` di cabang non-daemon) |
| 18 | Audit keamanan eksternal | **BELUM** | Belum ada. Ini keputusan owner, bukan pekerjaan kode |
| 19 | Deploy produksi di `4663` | **BELUM** | Belum ada. Lihat §4 |
| 20 | `setMarketHalt` per-saham | **TIDAK PERLU (sekarang)** | ABI-compat shim: `setMarketHalt(stock, halted)` meng-set `_buysPaused[stock]` **dan** `_globalPaused`. Arahnya fail-safe. Perilakunya dikunci test `test_setMarketHaltIsGlobalDocumentedFootgun`. Membuatnya benar-benar per-saham = perubahan ABI, bukan bug |
| 21 | Uniswap V3 TWAP pool USDG/stock | **TIDAK PERLU (sekarang)** | Pool dengan likuiditas nyata belum ada, dan pool buatan sendiri = harga yang mereferensi dirinya sendiri, lebih buruk daripada tidak ada. `TWAP_REFERENCE` dibiarkan kosong + warning dari script; cross-check TWAP memakai `KeeperTwapReference` |
| 22 | Paymaster benar-benar mensponsori gas | **BELUM** | `EntryPoint.getDepositInfo(0xe9E30Cc7E32bd55959d8bb109aecc9344a611Cb7)` = `(0, false, 0, 0, 0)` — deposit **0 wei**. Akun 4337 bisa dideploy, tapi UserOperation yang memakai paymaster akan ditolak `AA31 paymaster deposit too low`. Stack AA baru terbukti di fork test (8 test, EntryPoint v0.7 asli), belum di chain. Deposit sengaja 0 karena penarikannya terkunci `withdrawTo` di balik timelock 48 jam Ubah ke jalur timelock: agen tidak bisa menaikkan deposit tanpa proposal 48 jam (`deposit()` di `ArcumPaymaster.sol` `onlyOwner`, dan `owner()` = timelock). |
| 23 | Cross-check TWAP hidup di `46630` | **BELUM** | `KeeperTwapReference.observationCount(NVDA) = 0`. Penyebab bukan lupa: tidak ada feed Chainlink di `46630` (`eth_getCode` tiga alamat feed = 0 byte), jadi harga yang tersedia hanya `setMockPrice`. Merelay harga mock ke TWAP = memalsukan TWAP. Aktif setelah guard produksi yang punya sumber harga otoritatif jalan di chain itu |
| 24 | Penjadwal tahan logoff/tidur | **SIAP (diubah 2026-11-20)** | Tiga task sekarang berjalan sebagai **SYSTEM**: `schtasks /query /tn ArcumKeeper /v` → `Logon Mode: Interactive/Background`, `Run As User: SYSTEM`; sama untuk `ArcumVol` dan `ArcumRpcRelay`. Sebelumnya `Interactive only`, jadi accrue/publish berhenti saat logoff atau tidur dan gejalanya log diam, bukan error. Installer (`app/ops/install-keeper-task.ps1`, `vol-engine/ops/install-vol-task.ps1`) kini default SYSTEM (`-PerUser` untuk perilaku lama) dan tetap membersihkan `DisallowStartIfOnBatteries`/`StopIfGoingOnBatteries` serta `StartWhenAvailable`. Verifikasi akhir 2026-11-20: `ArcumKeeper` jalan sebagai SYSTEM → `{"action":"accrueCheck","dueCount":0}` dan log menulis `keeper exit rc=0`; `ArcumVol` jalan sebagai SYSTEM → `posted 3 reading(s) in one tx: 0xac306602…74e8` |
| 25 | Admin legacy pool lepas dari key bocor | **SIAP (dieksekusi di `46630`)** | `writerPoolProxy 0x1F79F6D8…550F` adalah UUPS (`src/WriterPool.sol:51-56`, `_authorizeUpgrade` → `onlyRole(DEFAULT_ADMIN_ROLE)` di baris 777), jadi otoritasnya ada di storage proxy, bukan di slot admin ERC-1967 (`0xb5312768…6103` kosong — normal untuk UUPS, bukan proteksi). Sebelum perbaikan `hasRole(0x00…00, 0x1B4Faa13…3E45)` = **true**: key bocor bisa `upgradeToAndCall` dan mengambil `totalAssets` 5.001.600.174.745 (5.001.634,831397 USDG, 6 desimal). **Dieksekusi 2026-11-20** lewat `contracts/script/RotateLegacyPoolAdmin.s.sol`: `grantRole` tx `0xe5fe6efe…6b198` (blok 155921875, gas 56.093) lalu `renounceRole` tx `0xf9f4fa73…c9d8` (blok 155921908, gas 29.809), total 85.902 gas = 0,00000085902 ETH. Verifikasi sesudahnya: `hasRole(0x00…00, timelock)` = **true**, `hasRole(0x00…00, 0x1B4Faa13…3E45)` = **false**, implementation dan `totalAssets` tidak berubah. Konsekuensi: upgrade pool sekarang butuh proposal timelock 48 jam |
| 26 | Sisa admin legacy: `feeRouter` + `reserve` | **SIAP (dieksekusi di `46630`)** | Sapuan seluruh alamat di `deployments/46630.json` menemukan dua kontrak yang tidak masuk rotasi mana pun: `feeRouter` (`src/FeeRouter.sol:15`, `Ownable`) dan `reserve` (`src/Reserve.sol:14`, `AccessControl`, `setParams` baris 43). **Dieksekusi 2026-11-20** lewat `contracts/script/RotateLegacyRemainder.s.sol`: `transferOwnership` tx `0x3cf673cc…43a3` (blok 155926233, gas 28.646), `grantRole` tx `0x7c7e2d1a…01d5` (blok 155926261, gas 50.821), `renounceRole` tx `0xe513912d…31f` (blok 155926286, gas 24.533) — total 104.000 gas = 0,00000104 ETH, flag `--slow` agar nonce tidak balapan. Verifikasi: `feeRouter.owner()` = timelock, `reserve.hasRole(0x00…00, timelock)` = true, `reserve.hasRole(0x00…00, key bocor)` = false. Dampak yang dicegah terbatas: `FeeRouter` tidak punya fungsi `onlyOwner`, dan admin `Reserve` hanya bisa `setParams` dalam batas (income ≤ 5.000 bps, target ≤ 2.500 bps) — dana hanya keluar lewat `cover()` yang dijaga `pool` |
| 27 | Transport RPC tahan reset | **SIAP (dieksekusi 2026-11-20)** | Edge menutup TLS untuk fingerprint Rust (`os error 10054`) dan Python (`WinError 10054`), sementara `bun fetch` diterima. Relay `app/ops/rpc-proxy.mjs` (byte-forward, tanpa tanda tangan/cache/key) sekarang dijalankan sebagai task `ArcumRpcRelay` (`/sc onstart /ru SYSTEM`, `ExecutionTimeLimit=PT0S`, loop restart 5 detik di `app/ops/run-relay.cmd`), dan `RH_TESTNET_RPC` di `app/.env` menunjuk `http://127.0.0.1:8547`. Bukti: `ArcumVol` sebagai SYSTEM menerbitkan tx `0xac306602…74e8`; `forge script … --broadcast --slow` menyelesaikan 3 tx rotasi |

---

## 2. Bukti on-chain yang dipegang (4663), bukan dari manifest

Diambil langsung dari `https://rpc.mainnet.chain.robinhood.com` (`eth_chainId` = `0x1237` = 4663):

| Item | Nilai |
|---|---|
| USDG | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`, symbol `USDG`, 6 dp |
| NVDA token | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC`, 18 dp |
| AAPL token | `0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9`, 18 dp |
| QQQ token | `0xD5f3879160bc7c32ebb4dC785F8a4F505888de68`, 18 dp |
| FEED_NVDA | `0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15` → `"RHNVDA / USD"`, 8 dp |
| FEED_AAPL | `0x6B22A786bAa607d76728168703a39Ea9C99f2cD0` → `"Robinhood AAPL / USD"`, 8 dp |
| FEED_QQQ | `0x80901d846d5D7B030F26B480776EE3b29374C2ae` → `"Robinhood QQQ / USD"`, 8 dp |

**Umur feed, diukur langsung pada head block **ts `1795160359`** (2026-11-20 07:39:19 UTC = 02:39 ET, sesi **CLOSED** karena pre-market mulai 04:00 ET):**

| Feed | `updatedAt` | Umur saat head | Harga |
|---|---|---|---|
| NVDA | 1795151162 | 9197 s (2,6 jam) | `143.30682831` |
| AAPL | 1795151540 | 8819 s (2,5 jam) | `349.86433214` |
| QQQ | 1795159711 | **648 s (11 menit)** | `637.66333941` |

QQQ ter-update di antara dua sampel (sebelumnya 21806 s), jadi feed-nya hidup — umur besar hanya terjadi saat pasar tutup, bukan karena feed mati. Ini yang membatalkan asumsi lama `MAX_AGE_REGULAR=90000` (25 jam). Angka itu dikirim dengan alasan "feed heartbeat 86400s"; kenyataannya feed berhenti saat pasar tutup, dan jendela 25 jam akan menganggap harga 6 jam sebagai **fresh** di tengah sesi. Karena sesi CLOSED sudah punya jendela sendiri (3 hari), nilai 90000 tidak membeli apa pun untuk weekend — ia hanya melonggarkan jendela yang penting. Sekarang `300` / `900`, dan script menolak > 3600.

Catatan operasional: NVDA dan AAPL berumur ~2,5 jam pada 02:39 ET. Dengan `MAX_AGE_EXTENDED = 900`, feed ini **tidak** akan dianggap fresh saat pre-market dibuka pukul 04:00 ET kecuali feed-nya sudah update — dan itu perilaku yang diinginkan, bukan bug. Sebelum launch, ukur ulang kadens riil per feed di dalam sesi hidup, jangan mengasumsikan heartbeat.

**TSLA dan SPY belum punya feed Chainlink di 4663**, jadi keduanya tidak bisa masuk rilis produksi dulu. Daftar produksi = NVDA, AAPL, QQQ.

---

## 3. Verifikasi yang dijalankan

```
forge test --no-match-path "test/fork/*"   -> 135 passed, 0 failed, 0 skipped (17 suite)
forge test --match-path "test/fork/*"      ->  15 passed, 0 failed, 0 skipped (2 suite)
RH_MAINNET_RPC=http://127.0.0.1:1 \
  forge test --match-contract Mainnet4663ForkTest  -> GAGAL di setUp (fail-closed, benar)
python -m pytest vol-engine/tests          ->  35 passed
```

Rincian suite non-fork:

| Suite | Test |
|---|---|
| `test/PriceGuardProd.t.sol` | 28 |
| `test/PriceGuardChainlink.t.sol` | 22 |
| `test/DeployProduction.t.sol` | 14 |
| `test/VolOracle.t.sol` | 13 |
| `test/KeeperTwapReference.t.sol` | 11 |
| `test/ArcumAA.t.sol` | 8 |
| `test/AgentRouter.t.sol` | 7 |
| `test/EverlastingMath.t.sol` | 7 |
| `test/ArcumEngine.t.sol` | 4 |
| `test/CloseCaveats.t.sol` | 4 |
| `test/UniswapV3TwapReference.t.sol` | 4 |
| `test/IntegrationE2E.t.sol` | 3 |
| `test/Invariants.t.sol` | 3 |
| `test/VaultsAndStaking.t.sol` | 3 |
| `test/SeriesRegistry.t.sol` | 2 |
| `test/Shield.t.sol` | 1 |
| `test/WriterPoolLifecycle.t.sol` | 1 |

Simulasi caveat closure (kredensial testnet, tanpa broadcast):
`SIMULATION COMPLETE`, 7.153.961 gas, **1 transaksi**, biaya 0,000143 ETH.

Broadcast caveat closure ke `46630` (2026-11-20, `--broadcast --slow`):

| Item | Nilai |
|---|---|
| Hash | `0x3060efd8bf65b2c842b95f828759e8d3492dd1da70b5674e79c9cec701f331dc` |
| Status | `1` (sukses), block `155859xxx` |
| Gas terpakai | `5.346.673` (estimasi 7.153.961 — estimasi lebih tinggi, bukan lebih rendah) |
| Harga gas nyata | `10.000.000` wei (0,01 gwei) |
| Biaya nyata | `0,00005346773 ETH` |
| Manifest | `deployments/46630-caveats.json` |

Keeper run pertama (2026-11-20 12:30 UTC): `0xe1cec46cb1346f8023890799d84132d3b64233927a5cdd16ae7832d5f6fd67d2`,
11 seri, gas `643.980`, biaya `0,0000064398 ETH`. Setelah migrasi filter `totalSupply > 0`,
estimasi untuk 3 seri berisi posisi = `203.146` gas (hemat 68,5%), dan 8 seri kosong tidak lagi dibayar.

---

## 4. Blocker yang benar-benar tersisa

1. ~~**Dana gas.**~~ **SELESAI untuk `46630`.** Stack caveat sudah dibroadcast (`0x3060efd8…f331dc`, 5.346.673 gas, biaya 0,00005346773 ETH) dan keeper terisi 0,002 ETH. Untuk `4663` dana produksi tetap belum disiapkan — dan tetap tidak bisa dipakai selama RPC mainnet mati (`os error 10060`, sebelumnya `invalid peer certificate: Expired`).
2. **Key deploy yang bersih.** Key staging `0x1B4Faa130Aa607Fce29F9AAd6120b4492DE93e45` bocor di chat 2026-11-17; ia **sudah tidak memegang owner di kontrak mana pun** (rotasi `46630` dieksekusi 2026-11-20, lihat §5) tetapi tetap tidak boleh dipakai untuk produksi. Script menolaknya secara eksplisit (`deployer is the compromised staging key`). Produksi harus memakai key yang tidak pernah muncul di chat, tiket, atau screenshot.
3. **`OWNER_ADDRESS` harus Safe/multisig yang bisa tanda tangan.** `PriceGuardProd`, `VolOracle`, dan `KeeperTwapReference` adalah `Ownable2Step`: kalau Safe tidak memanggil `acceptOwnership()`, deployer tetap owner.
4. **Publisher vol harus jalan sebelum user pertama.** Dengan `VolOracle` terpasang, buy revert `StaleVol` bila tidak ada reading di dalam `[minTtl, maxAge]`. Urutan: deploy → Safe accept → `setPublisher(publisher, true)` → jalankan `post_vol.py` → baru buka deposit.
5. **Web/app harus membaca manifest produksi**, bukan manifest staging, sebelum UI diarahkan ke `4663`. Kalau tidak, UI akan mengiklankan `MockUSDG` seolah-olah produksi.
6. **Audit eksternal.** Belum ada satu pun. Keputusan owner.

---

## 5. Key state per 2026-11-20

- `contracts/.env.production` memegang `PRIVATE_KEY=0x707a…9d43` dan `OWNER_ADDRESS=0xbf82D8970BE95a0507D3431Bea74b10F4c1fe091`. **Keduanya sudah dikosongkan** (nilai dihapus, baris tetap ada). `0x707a…9d43` bocor di chat dan pernah hardcoded di `app/src/keeper/run.ts`; `0xbf82D897…e091` adalah keeper key lama yang juga bocor. Keduanya burnt.
- `contracts/.env` memegang `SAFE_OWNER_ADDRESS=0xf3e8c7F4167FF5b6B749c351eD8062874aa39A0b` (bocor, dihapus dari dokumen rencana) dan `PRIVATE_KEY=` kosong.
- Ini penting karena `forge` memuat `contracts/.env` otomatis tetapi **tidak** memuat `.env.production`. Key basi yang tertinggal di salah satunya akan diam-diam menandatangani deploy produksi.
- Kedua file gitignored (`contracts/.gitignore:1` `.env`, `:2` `.env.*`), jadi tidak pernah masuk repo.
- `kredensial.txt` (gitignored, baris 58 `.gitignore`) sekarang format `.env` bersih. `PRIVATE_KEY` di dalamnya **sudah terekspos di chat** → hanya boleh untuk testnet, jangan untuk produksi.
- Key staging `0x1B4Faa130Aa607Fce29F9AAd6120b4492DE93e45` bocor di chat 2026-11-17. **Rotasi dieksekusi 2026-11-20**: `ArcumEngine`, `PriceGuard`, dan `SeriesRegistry` di `46630` sekarang dimiliki timelock `0x249ACeb7d446F5f0375e6E6b6F3b88f88e399E6b` (tx `0x3aca4f25…69f3d8`, `0x2b724b76…af2ca5`, `0x4d2e18cf…ee7d5a`; 86.557 gas). Sisa saldo key itu 0,00616602346 ETH — hanya bahan bakar testnet. `DeployProduction.s.sol:284` tetap menolaknya dengan revert `"deployer is the compromised staging key (exposed 2026-11-17): generate a fresh key first"`.
- EntryPoint v0.7 singleton `0x0000000071727De22E5E9d8BAf0edAc6f37da032` dipakai apa adanya; bukan milik Arcum, tidak perlu di-deploy.

---

## 6. Perintah broadcast (butuh izin eksplisit)

### 6a. Tutup caveat di testnet `46630`

```bash
cd contracts
set -a; . ../kredensial.txt; set +a
forge script script/CloseCaveats.s.sol:CloseCaveats --rpc-url "$RPC"                 # simulasi
forge script script/CloseCaveats.s.sol:CloseCaveats --rpc-url "$RPC" --broadcast --slow  # irreversible
```

### 6b. Deploy produksi di `4663`

```bash
cd contracts
cp .env.production.example .env.production
# isi: PRIVATE_KEY (fresh, belum pernah di chat), OWNER_ADDRESS (Safe), TL_PROPOSER, TL_EXECUTOR, KEEPER_ADDRESS
set -a && source .env.production && set +a

# 1) preflight read-only ke mainnet asli — tidak memakai gas
DRY_RUN=true forge script script/DeployProduction.s.sol:DeployProduction --rpc-url $MAINNET_RPC

# 2) broadcast — gas nyata, tidak bisa dibatalkan, ~20 kontrak
forge script script/DeployProduction.s.sol:DeployProduction --rpc-url $MAINNET_RPC --broadcast --slow
```

Jangan jalankan langkah 2 dengan key staging, dan jangan jalankan sebelum Safe yang akan menjadi owner terbukti bisa menandatangani.

---

## 7. Catatan temuan (jujur, bukan pujian)

Empat hal yang ditemukan salah saat pass ini, dan sudah diperbaiki:

1. **`MAX_AGE_REGULAR=90000`** — alasan "heartbeat 86400s" tidak berlaku di dalam sesi. Diukur: QQQ 6 jam basi. Turun ke 300, plus guard `> 3600` ditolak script.
2. **`vol-engine/vol_engine/signer.py`** membangun EIP-712 `VolReading{stock,sigmaBps,skewK,nonce,expiresAt}`, sedangkan `VolOracle` tidak punya `ecrecover`, `nonce`, `expiresAt`, atau domain — otorisasinya allowlist `isPublisher`. Signature itu tidak bisa dikonsumsi kontrak mana pun, jadi poster berbasis modul itu tidak akan pernah memposting apa pun. Diganti `VolPublisher` (`postMany`), `signer.py` ditandai deprecated.
3. **Contoh keeper di dokumen lama** memakai `session === 3` sebagai `HALTED`. Urutan enum sebenarnya `REGULAR=0, EXTENDED=1, CLOSED=2, UNKNOWN=3, HALTED=4` — jadi keeper akan salah menganggap `UNKNOWN` sebagai halt, dan justru jalan saat `HALTED` (yang nilainya 4).
4. **Dokumen tim menyebut `VolOracle` punya domain EIP-712 `"LemniscateVolOracle"`** dan meminta menggantinya jadi `"ArcumVolOracle"`. Tidak ada EIP-712 di `VolOracle` sama sekali; yang ada `setPublisher(address,bool)`.

Dua hal yang ditemukan sebagai perilaku disengaja, bukan bug, dan sekarang didokumentasikan + dikunci test:

- `setMarketHalt(stock, halted)` mem-pause **semua** saham (`_globalPaused`), bukan hanya `stock`. Fail-safe, tapi footgun operator.
- Guard **tidak** mem-pause saat sesi CLOSED. Buy sudah ditolak `SessionBlocksBuys` di engine, dan sell harus tetap terbuka agar writer bisa keluar.
