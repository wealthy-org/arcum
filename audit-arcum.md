# Arcum: Integrasi Modul ke UI Web sampai Testnet 46630 (Tanpa Mockup, Tanpa Hardcode)

> **Untuk:** dev Arcum
> **Dasar:** commit `7efdb22` ("broadcast arcum protocol to robinhood testnet 46630") dan `ARCUM_ROBINHOOD_DEV_BRIEF.md`
> **Dicek:** 13 Nov 2026. Metode: baca source, baca chain testnet, simulasi `forge` di fork testnet (state chain asli, waktu digeser ke jam pasar AS)
> **Status dokumen:** dokumen induk revisi. Menggantikan versi sebelumnya.

---

## ⏱️ STATUS TERBARU — 13 Nov 2026 malam (commit `766f5c3`)

> Bagian ini ringkasan progres. Detail tiap item ada di bagian bernomor di bawah (lihat kolom "Detail").

### ✅ Sudah selesai (terverifikasi)
| Item | Bukti |
|---|---|
| Kunci mainnet: tidak ada alamat Lemniscate di web/MCP, transaksi hanya di chain 46630, tombol "Switch to Robinhood Testnet" (§4.6, §4.5) | Commit `e088217`, `766f5c3`; dicek di kode |
| 3.1 Sell bayar lewat `IPool.pay`, buy panggil `onSale` | Simulasi fork: sell sukses, USDG kembali |
| 3.2 `setModules`: `pool.engine()` = engine | `cast call` di testnet |
| 3.3 Shield pilih strike dari series yang dilist + cek saldo saham | Simulasi fork: shield sukses, melebihi saldo ditolak |
| 3.4 Seed pool lewat `deposit` | Round-trip 100 USDG → 99,90 (selisih 0,1% = NAV guard, sesuai desain) |
| 3.5 `sellFor` di engine, hasil ke owner | Simulasi fork: owner menerima, agent 0 |
| 3.7 Cheat `vm.prank(pool)` di tes sell dihapus | `forge test` 37/37 |
| 3.8 Manifest hanya ditulis saat broadcast | Dicek di script |
| Redeploy testnet, 11 series (Shield untuk 5 saham) | 15 alamat punya kode |
| Source kontrak verified di Blockscout | 19/21 verified (partial match) |
| H1, H5, H6 (posisi palsu, Activity palsu, "Ticket #17") dihapus dari Live Mode, dipindah ke `demoFixtures.ts` | Commit `dff4341` |

### ❌ Belum dikerjakan — urut prioritas

| # | Item | Kenapa penting | Detail |
|---|---|---|---|
| **1** | **🔴 Buy dari UI selalu gagal: series ID dikarang.** `web/src/pages/DashboardPage.tsx:211` membuat ID dari teks `0xNVDA_UP_142.5_D` lalu `keccak256`. Kontrak memakai `registry.idOf(stock, isCall, strike, tau)`. Bukti: tx `0xaad0c650fee89ad8fed132e252a5dbae35a0c324b2cef33ffd89b0c43b6c9012` dari wallet owner revert `SeriesUnknown` | Satu-satunya fitur "on-chain" di web ternyata tidak pernah berhasil. Strike di modal juga salah (menampilkan harga spot $142,50, bukan strike yang dilist) | §5.1 |
| **2** | **Web belum membaca chain sama sekali** (0 `useReadContract`/`getLogs`). Belum ada `useSeriesList`, `usePrice`, `useQuote`, `usePositions`, `usePool`, `useActivity`, `useTx` | Tanpa ini semua angka di layar tetap bukan data chain | §4.3 |
| **3** | **Sell / Close masih state lokal** (`handleClosePosition` → `setPositions`) | Kontrak sudah siap, UI belum | §5.3 |
| **4** | **Shield masih state lokal** (`handleExecuteShield` → `setPoolStats`) | Kontrak sudah siap | §5.4 |
| **5** | **Pool deposit / withdraw / claim masih state lokal** | Kontrak sudah siap | §5.5–5.7 |
| **6** | **Agent policy / revoke masih state lokal**; `INITIAL_AGENT_POLICY.agentAddress` diisi alamat AgentRouter (router bukan agent) | Kontrak sudah siap | §5.8 |
| **7** | **Activity Live Mode kosong**, belum membaca event | Brief §17 receipts/indexing | §5.9 |
| **8** | **Hardcode baru:** `INITIAL_POOL_STATS` (NAV 5.000.000, kapasitas 35 jt, NAV/share 1,001) ditulis tangan; `change24h` palsu (5 baris di `protocol.ts`); tombol `npx -y @arcum/mcp` (paket tidak ada di npm) | Angka mirip chain tapi bukan dibaca dari chain | §6 (H2, H8, H18) |
| **9** | **Faucet modal tanpa guard chain** (`TestnetFaucetModal.tsx`): wallet di mainnet tetap kirim `mint` ke alamat kosong | Sama dengan bug approve kemarin, belum ditutup di faucet | §4.5 |
| **10** | `initialChain={robinhoodChain}` (mainnet) di `Web3Provider.tsx:30` | Sudah tidak berbahaya karena ada guard, tapi seharusnya `robinhoodTestnet` | §4.5 |
| **11** | **`shieldFor` lewat agent masih revert**: `AgentRouter._pickShield` tidak sama dengan logika engine | Agent tidak bisa Shield | §3.5 |
| **12** | **"Fork test" bukan fork**: `Testnet46630.t.sol` deploy lokal, tidak membaca `46630.json`; `shieldFor` tidak dites | Bug no. 11 lolos karena ini | §3.7 |
| **13** | 5 library (Greeks, Math, Funding, PoolHedging, PoolLayers) tidak tercatat di `46630.json`; PoolLayers belum verified (belum ter-index Blockscout) | Manifest tidak lengkap | §4.1 |
| **14** | Keeper masih simulasi di memori (tidak memanggil `accrueMany`); indexer di memori; `scripts/agent_quickstart.ts` masih mencetak tx palsu `0x8f4c…` | Klaim service yang tidak nyata | §6.D (H22–H27) |
| **15** | Rute yang belum ada: tab overview, `/protocol`, `/writers`, `/costs`, `/markets/*`, `/learn/*`, `/privacy`, `/product-terms` | Brief §7 | §9 |
| **16** | **Bukti E2E testnet**: `docs/TESTNET_E2E_EVIDENCE.md` belum ada; belum ada satu pun buy/sell/shield/deposit sukses dari UI di Blockscout | Definition of Done | §11 |

### Urutan kerja yang disarankan
1. **Hari ini:** item 1 (series ID) + 9 (guard faucet). Bukti: satu tx `buy` **sukses dari UI** di Blockscout, dengan biaya = quote.
2. Item 2 (hook baca chain), lalu 3–7 (sambungkan Sell, Shield, Pool, Agent, Activity).
3. Item 8 (buang hardcode yang tersisa), 10, 11–13.
4. Item 14–16, lalu isi E1–E26.

**Progres terhadap Definition of Done testnet: ±45%.** Kontrak sudah jalan dan bisa diaudit publik; yang tersisa hampir semuanya di web (menyambungkan UI ke kontrak) dan bukti transaksi.

---

## Daftar isi

0. Cara membaca dokumen ini
1. Ringkasan kondisi: brief vs repo vs web
2. Inventaris modul yang sudah dibangun (deploy, fungsi, hasil uji)
3. Perbaikan kontrak (BLOCKER, kerjakan pertama)
4. Fondasi integrasi web (wajib sebelum fitur)
5. Integrasi per fitur UI (modul → layar)
6. Daftar TAKEOUT: semua hardcode yang harus dihapus
7. Modul yang tidak diaktifkan di testnet (status jujur di UI)
8. x402: dikeluarkan dari scope
9. Rute halaman yang belum ada
10. State UI wajib di setiap alur
11. Uji end-to-end testnet (skenario dan bukti)
12. Urutan kerja dan Definition of Done

---

## 0. Cara membaca dokumen ini

Setiap item ditulis dengan format yang sama:

- **Before**: kondisi sekarang dan alasan kenapa salah
- **Langkah**: apa yang diubah, termasuk nama fungsi kontrak yang dipakai
- **After**: tujuan setelah diubah
- **Bukti selesai**: yang harus dikirim, biasanya tx hash di `https://explorer.testnet.chain.robinhood.com` atau output `cast`

**Aturan utama:**
1. Di **Live Mode**, setiap angka di layar harus berasal dari salah satu sumber berikut: (a) `eth_call` ke kontrak, (b) event on-chain, (c) receipt transaksi user. Tidak ada sumber keempat.
2. Kalau data tidak bisa dibaca, tampilkan `—` atau "Data tidak tersedia". **Jangan** pakai angka cadangan.
3. **Demo Mode** boleh memakai angka contoh, asal semuanya dari satu file `demoFixtures.ts` dan ada badge "DEMO" yang selalu terlihat.
4. Klaim "sudah jalan" hanya diterima dengan tx hash testnet. Tes lokal (Foundry, Bun, Pytest) perlu, tapi bukan bukti testnet.

---

## 1. Ringkasan kondisi: brief vs repo vs web

| Modul (brief §4) | Kontrak di repo | Deploy di 46630 | Fungsi kontrak di fork | Tersambung ke UI | Status |
|---|---|---|---|---|---|
| Up/Down Buy | `ArcumEngine.buy` | ✅ | ✅ (saat jam pasar) | ✅ | Jalan, quote belum dari kontrak |
| Sell / Close | `ArcumEngine.sell` | ✅ | ❌ revert | ❌ | **Bug kontrak** |
| Holding cost (norm) | `ArcumEngine.accrue`, `Funding` | ✅ | ✅ | ❌ (norm hardcoded) | Perlu UI |
| Shield | `ArcumEngine.shield` | ✅ | ❌ revert | ❌ | **Bug kontrak** |
| Writer Pool deposit | `WriterPool.deposit` | ✅ | ⚠️ jalan, share salah | ❌ | **Bug seed** |
| Pool withdraw/claim | `requestWithdraw`, `claim` | ✅ | ⚠️ jalan, rugi ~10% | ❌ | **Bug seed** |
| Pool NAV/risk | `nav`, `navBand`, `capsFor`, … | ✅ | ✅ | ❌ (hardcoded) | Perlu UI |
| Market/session | `PriceGuard.read` | ✅ | ✅ | ❌ | Perlu UI |
| Volatility | VolOracle | ❌ tidak ada | sigma 50% tetap | ❌ | Kontrak belum dibuat |
| Agent policy | `AgentRouter.setPolicy/revoke/buyFor` | ✅ | ✅ | ❌ | Perlu UI |
| Agent sell/shield | `AgentRouter.sellFor/shieldFor` | ✅ | ❌ revert (`sellFor`) | ❌ | **Bug kontrak** |
| Fees | `FeeRouter` | ✅ | belum diuji | ❌ | Perlu wiring |
| Reserve | `Reserve` | ✅ | belum diuji | ❌ | Perlu wiring |
| TWAP | `UniswapV3TwapReference` | ✅ (salah konfigurasi) | — | ❌ | Tandai disabled |
| Hedging | `WriterPool.rebalance` | ✅ (tanpa route) | — | ❌ | Tandai disabled |
| Activity/receipts | event | ✅ | ✅ | ❌ (hardcoded) | Perlu UI |
| Timelock | — | ❌ | — | ❌ (alamat palsu di UI) | Hapus atau deploy |
| Vaults, Staking, BuyBurn | ada di `src/` | ❌ | — | ❌ | Later-phase, tampilkan "disabled" |
| Account abstraction (4337) | — | ❌ | — | ❌ (diklaim di Docs) | Tampilkan "tidak aktif" |
| x402 | — | — | — | — | **Dikeluarkan dari scope (lihat §8)** |
| Faucet | `MockUSDG.mint` | ✅ | ✅ | ✅ | Jalan |
| Exit | — | — | — | ✅ halaman | Perlu alamat dari manifest |

Kesimpulan: brief sudah benar dan eksplisit ("Tahapan pengerjaan bukan izin mengurangi scope menjadi website demo"). Web saat ini memenuhi **tampilan**, tapi baru Buy dan Faucet yang tersambung ke kontrak.

---

## 2. Inventaris modul yang sudah dibangun

Alamat diambil dari `deployments/46630.json`. Semua punya bytecode di chain, dan pembuatnya adalah deployer `0x1B4F…3e45`.

| Kontrak | Alamat | Fungsi untuk user (write) | Fungsi baca (view) | Event |
|---|---|---|---|---|
| **ArcumEngine** | `0xB235F41d44F301520B34a276D196BBd3ab6457A2` | `buy(id,units,maxCost,deadline,recipient)`, `sell(id,tokens,minProceeds,deadline,recipient)`, `shield(stock,units,pctBelowBps,maxCost,deadline)`, `accrue(id)`, `accrueMany(ids)`, `cancelQueued(ticket)`, `fillQueued(ticket)` | `quote(id,units,isBuy)`, `vMark(id)`, `totalLiability()`, `netGreeks(stock)`, `usdg()`, `registry()` | `Bought`, `Sold`, `ShieldBought`, `Accrued`, `SellQueued`, `QueuedSellFilled`, `QueuedSellCancelled`, `BuysPaused`, `AutoPaused`, `AutoResumed` |
| **SeriesRegistry** | `0x359105D4b3dF23BfDEC8E12c97b4cFeA9a830Fc7` | (admin) `listSeries`, `setAllowedStock` | `seriesCount()`, `seriesIdAt(i)`, `seriesOf(id)`, `idOf(stock,isCall,strike,tau)`, `epochOf(id)`, `currentEpoch(...)` | `SeriesListed`, `SeriesBuyableSet`, `SeriesArchived`, `EpochListed` |
| **PriceGuard** | `0x152Cf15955D1ECC59Fd820565c25990e1367936F` | (admin) `setMockPrice`, `setMarketHalt`, `setBuysPaused`; publik `poke(stock)` | `read(stock)` → `{s, session, fresh, buysPaused, updatedAt}`, `readLite`, `config(stock)`, `lastGoodPrice(stock)` | `StockConfigured`, `BuysPausedSet`, `TwapSourceSet` |
| **WriterPool** (proxy) | `0x4c7882288286309E62312EA9a6e9F6100E14B241` | `deposit(assets,receiver)`, `requestWithdraw(shares)`, `claim(ticket)`, `checkpoint()` | `nav()`, `navBand()`, `navPerShare()`, `navParts()`, `totalAssets()`, `totalSupply()`, `balanceOf(user)`, `previewDeposit`, `previewRedeem`, `maxDeposit(user)`, `unlockTime(user)`, `ticketOf(ticket)`, `capsFor(liab)`, `maxOutstandingBps()`, `maxPerNameBps()`, `hedgeEquity()`, `hedgeStale()`, `hedgeStocks()`, `hedgeUnits(stock)`, `hedgerLimits()` | `Deposit` (ERC-4626), `WithdrawalQueued`, `WithdrawalClaimed`, `SaleRecorded`, `PaidOut`, `FundingRecorded`, `IncomeSplit`, `ReserveDrawn`, `Rebalanced` |
| **AgentRouter** | `0x128964a29e0e2C8D16eCbc5D65164df74d9168e4` | Owner: `setPolicy(agent,budget,maxPerTrade,expiresAt,canSell,canShield,stocks[])`, `revoke(agent)`, `cancelQueuedFor(ticket)`. Agent: `buyFor`, `sellFor`, `shieldFor` | `policyOf(owner,agent)`, `remainingBudget(owner,agent)`, `allowedStocks(owner,agent)`, `isAllowedStock(...)`, `ticketOwner(ticket)` | `PolicySet`, `PolicyStocks`, `PolicyRevoked`, `AgentTrade`, `QueuedSellFor` |
| **Reserve** | `0x6a438799f499354976B633f79eaFbd030444a824` | (pool) `cover` | `balance()` | `Covered`, `ParamsSet` |
| **FeeRouter** | `0xab169002108AE3912a54582C1869990bdAB0c708` | `distribute()` (publik) | `distributable()` | `Distributed`, `Held`, `RecipientSet`, `SplitSet`, `ProtocolFeeSet` |
| **UniswapV3TwapReference** | `0x06130bb275AeA45133830fB1AdD518c2c4caD72f` | — | `referencePrice`, `spotPrice` | — |
| **WriterPool impl** | `0x099DC732855d340c503f9144464bA00901AED8FF` | — (implementasi proxy) | — | — |
| **OptionToken** (per series) | dari `seriesOf(id).token` | (engine) `mint`/`burn` | `balanceOf(user)`, `totalSupply()` | `Transfer` |
| **MockUSDG** | `0x2d97243c649E0CCBAe64155391472c323856BF13` | `mint(to,amount)` (faucet), `approve` | `balanceOf`, `allowance` | `Transfer`, `Approval` |
| **Mock NVDA / TSLA / SPY / QQQ / AAPL** | `0x2D6C…4867` / `0x073f…9A74` / `0x160C…f405` / `0x4665…b521` / `0x569B…cFD2` | `mint` (untuk uji Shield) | `balanceOf` | `Transfer` |

**Series yang dilist (7):** NVDA Up $138/$141/$144/$147/$150 Daily, NVDA Down $140 Weekly, TSLA Up $240 Daily. `seriesCount()` = 7.

**Parameter testnet aktual:** antrean withdraw 1800 detik (30 menit) dari constructor `WriterPool(1800)`, lock deposit di-set lewat `setParams` (cek `unlockTime(user)`), harga mock: NVDA 142,50, TSLA 248,80, SPY 585,20, QQQ 498,40, AAPL 226,75.

### Hasil simulasi di fork testnet

| Uji | Hasil |
|---|---|
| `quote` NVDA Up $141, 1 unit | ✅ ~2,24 USDG |
| `buy` di luar jam pasar (01:30 ET) | ❌ `SessionBlocksBuys(CLOSED)`. Perilaku ini **benar**, tapi UI harus memberi tahu |
| `buy` jam pasar (11:00 ET) | ✅ biaya 2,244363 USDG |
| `sell` | ❌ `ERC20InsufficientAllowance(engine, 0, …)` |
| `shield` NVDA 5% | ❌ `SeriesUnknown` |
| `accrue` setelah 1 jam | ✅ |
| `deposit` 100 USDG | ⚠️ dapat 18 share |
| `requestWithdraw` dan `claim` | ⚠️ berhasil, tapi yang kembali **90,00 USDG dari 100** (rugi 10%) |
| `AgentRouter.setPolicy` | ✅ |
| `AgentRouter.buyFor` oleh agent | ✅ biaya 2,24, `remainingBudget` turun dari 100 ke 95,51 |
| `AgentRouter.sellFor` | ❌ revert tanpa pesan (`0x`) |
| `AgentRouter.revoke` | ✅ |

---

## 3. Perbaikan kontrak (BLOCKER)

Selama bagian ini belum beres, menyambungkan UI hanya menghasilkan transaksi revert.

### 3.1 Sell selalu revert

**Before**
`ArcumEngine.sell()` dan `fillQueued()` membayar user dengan `USDG.safeTransferFrom(pool, recipient, …)`. Pool tidak pernah memberi allowance ke engine. User bisa membeli tapi **tidak bisa menjual**, sehingga dana terkunci di option token.

**Langkah**
- Ganti dengan `IPool(pool).pay(recipient, proceeds, spread)`. Fungsi ini sudah ada di WriterPool (`onlyEngine`) dan memang dirancang untuk membayar.
- Di `_buyInternal`, setelah USDG masuk pool, panggil `IPool(pool).onSale(id, cost, spread)` supaya income dan liability tercatat.
- Tes Foundry: buy, lalu sell, dan saldo USDG user bertambah. Ulangi untuk `fillQueued`.

**After**
Siklus beli-jual tertutup, dan pool mencatat semua alur uang.

**Bukti selesai:** tx `sell` sukses di testnet, dan event `Sold` serta `PaidOut` muncul.

### 3.2 WriterPool tidak kenal engine

**Before**
Script meng-initialize pool dengan `IOptionEngine(address(0))` dan tidak pernah memanggil `setModules`. Di chain, `pool.engine()` = `0x0`. Semua fungsi pool yang `onlyEngine` (`onSale`, `onFunding`, `pay`) mati.

**Langkah**
Di `DeployTestnet.s.sol`, setelah engine, reserve, fee router dan twap dibuat:
```solidity
pool.setModules(IOptionEngine(address(engine)), reserve, feeRouter, IPriceReference(address(twap)));
engine.setPool(address(pool)); // kalau belum
```

**After**
Engine, pool, reserve dan fee router saling terhubung.

**Bukti selesai:** `cast call 0x4c78…B241 "engine()(address)"` mengembalikan alamat engine.

### 3.3 Shield selalu revert

**Before**
`shield()` menghitung strike = spot × (1 − persen), contohnya 135,375, lalu mencari series dengan strike **persis** itu. Brief §3 justru melarang hal ini: "selects from listed buyable put strikes; do not invent an unavailable strike".

**Langkah**
- Pilih strike dari **daftar series put weekly yang dilist dan buyable**: yang tertinggi tapi masih ≤ target. Engine sudah punya konsep `shieldList(stock)` di interface AgentRouter, jadi implementasikan `shieldList` di engine.
- Cek kepemilikan stock token user (brief: "verify the user's Stock Token holding"). Error `ShieldExceedsHolding` sudah ada di interface.
- List put weekly untuk setiap stok yang ditawarkan di UI Shield.

**After**
Shield membeli put yang benar-benar ada, sesuai brief.

**Bukti selesai:** tx `shield` sukses dan event `ShieldBought` muncul.

### 3.4 Seed 5 juta USDG membuat writer rugi 10%

**Before**
Script memanggil `usdg.mint(pool, 5_000_000e6)` (donasi langsung, tanpa `deposit`). Di chain, `totalAssets` sekitar 5.000.050 USDG tapi share hanya 8. Simulasi: deposit 100 USDG dapat 18 share, lalu claim hanya mengembalikan **90,00 USDG**. Ini melanggar brief §13: "No profit/loss from a deposit/withdrawal round trip … Donation/first-deposit/virtual-share behavior tested."

**Langkah**
- Seed lewat `usdg.approve(pool)` lalu `pool.deposit(5_000_000e6, treasury)`. Jangan transfer langsung.
- Tambah tes round-trip: deposit lalu claim mengembalikan nilai yang sama (selisih hanya pembulatan wei).

**After**
NAV per share wajar dan writer tidak dirugikan oleh pembulatan.

**Bukti selesai:** deposit 100 lalu claim mengembalikan sekitar 100 USDG di testnet.

### 3.5 AgentRouter `sellFor` dan `shieldFor` revert

**Before**
`AgentRouter` memanggil fungsi engine lewat interface `IAgentRouterEngine`: `sellFor`, `syncSeries`, `shieldList`, `ticketCount`, `priceGuard`. **Fungsi-fungsi itu tidak ada di `ArcumEngine`.** Simulasi: `sellFor` revert tanpa pesan.

**Langkah**
Implementasikan di `ArcumEngine`: `sellFor(owner,id,tokens,minProceeds,deadline)` (hanya bisa dipanggil router dan membayar ke **owner**), `shieldList(stock)`, `syncSeries(max)`, `ticketCount()`, `priceGuard()`. Tambah tes: agent sell sukses, proceeds masuk ke owner, bukan ke agent.

**After**
Agent bisa buy, sell dan shield dalam batas policy, dan hasilnya selalu ke owner (brief §16).

**Bukti selesai:** tx `buyFor`, `sellFor` dan `shieldFor` sukses, plus satu `buyFor` yang revert karena melebihi budget.

### 3.6 Item kontrak lain

| Before | Kenapa salah | After |
|---|---|---|
| Sigma di-hardcode `5000` (50%) di `quote`, `sell`, dan `netGreeks` | Brief §12 minta VolOracle | Minimal: mapping `sigmaBps` per stok yang di-set admin, dibaca engine, dan ditampilkan di UI sebagai "sigma (testnet, di-set manual)". Penuh: VolOracle bertanda tangan |
| `UniswapV3TwapReference` diberi alamat **pool** sebagai factory | Konfigurasi rusak | Tidak ada Uniswap di testnet, jadi set `twap = address(0)` di modules dan tampilkan "TWAP check: disabled (testnet)" |
| Hedge route tidak di-set | `rebalance` tidak mungkin jalan | Tampilkan "Hedging: disabled (testnet)" |
| Timelock tidak ada | UI menampilkan alamat kosong `0x68c276…` | Deploy `TimelockController` (delay pendek untuk testnet, misalnya 10 menit) lalu `transferOwnership`, **atau** hapus baris dan teks "48h timelock" untuk testnet |
| Source belum verified | Tidak bisa diaudit publik | `forge verify-contract` untuk semua alamat, dengan Blockscout verifier |
| Recipient FeeRouter dan Reserve = deployer | Fee kembali ke wallet dev | Untuk testnet boleh, tapi tampilkan di halaman Contracts siapa penerimanya |

### 3.7 Tes Foundry menutupi bug Sell

**Before**
`contracts/test/ArcumEngine.t.sol:92-95` berisi:
```solidity
// Approve pool to spend USDG for sell payouts
vm.prank(pool);
usdg.approve(address(engine), type(uint256).max);
```
Tes "memaksa" pool memberi allowance lewat cheatcode, padahal di deployment nyata pool tidak pernah melakukannya. Karena itu tes lulus (32/32) sementara sell di testnet selalu revert. Pola yang sama muncul di tes lain yang memakai `vm.prank(pool)`.

**Langkah**
- Hapus semua `vm.prank(pool)` / `vm.prank(address(pool))` yang melakukan sesuatu yang tidak dilakukan pool sungguhan.
- Setup tes harus **memanggil script deploy yang sama** (atau fungsi setup yang identik dengan `DeployTestnet.s.sol`), supaya bug wiring seperti `setModules` ketahuan.
- Tambah **fork test** `contracts/test/fork/Testnet46630.t.sol` yang membaca `deployments/46630.json` dan menjalankan buy, sell, shield, deposit, claim, dan agent pada alamat yang benar-benar ter-deploy (pola sama dengan simulasi di §2).

**After**
Tes gagal kalau deployment rusak. "32/32 lulus" kembali berarti sesuatu.

**Bukti selesai:** fork test lulus terhadap alamat testnet baru.

### 3.8 Script deploy menulis manifest walaupun tidak broadcast

**Before**
`DeployTestnet.s.sol` memanggil `vm.writeJson(..., "../deployments/46630.json")` **di luar** pengecekan broadcast. Simulasi atau dry-run apa pun, termasuk di Anvil lokal, menimpa manifest testnet dengan alamat lokal. Ini sudah terjadi saat pengecekan (file langsung dikembalikan dengan `git checkout`).

**Langkah**
Tulis manifest hanya kalau `block.chainid == 46630`, dan dari file `broadcast/.../run-latest.json`, bukan dari simulasi. Untuk chain lain tulis ke `deployments/<chainId>.json`.

**After**
Manifest testnet tidak bisa tertimpa tanpa sengaja.

Setelah 3.1–3.8 selesai: **redeploy** testnet, `deployments/46630.json` ikut ter-update otomatis, lalu web membaca manifest yang baru (§4.1).

---

## 4. Fondasi integrasi web (wajib sebelum fitur)

### 4.1 Satu sumber alamat

**Before**
Alamat ditulis manual di `web/src/data/protocol.ts` dan `web/src/config/wagmi.ts`, ditambah `46630.json`, jadi ada 3 salinan. Timelock palsu masuk lewat salinan manual ini.

**Langkah**
`import deployment from '../../../deployments/46630.json'` (atau salin saat build lewat script). Satu fungsi `getContracts(chainId)` dipakai di semua tempat.

**After**
Redeploy otomatis memperbarui web, dan tidak ada alamat yang tidak ada di chain.

### 4.2 ABI dari hasil build

**Before**
`web/src/contracts/abis.ts` ditulis tangan.

**Langkah**
Generate dari `contracts/out/*.json` (misalnya script kecil atau `wagmi cli` plugin foundry). Wajib ada: Engine, Registry, PriceGuard, WriterPool, AgentRouter, FeeRouter, Reserve, OptionToken, ERC20.

**After**
Signature fungsi di web selalu sama dengan kontrak yang di-deploy.

### 4.3 Hook baca dan tulis standar

Buat folder `web/src/hooks/chain/`:

| Hook | Isi |
|---|---|
| `useSeriesList()` | `seriesCount` lalu `seriesIdAt(i)` dan `seriesOf(id)` (multicall), hasilnya daftar series lengkap dengan token, norm, buyable |
| `usePrice(stock)` | `priceGuard.read(stock)`, berisi harga, sesi, fresh, buysPaused, updatedAt |
| `useQuote(id, units, isBuy)` | `engine.quote` |
| `usePositions(user)` | balanceOf semua OptionToken, lalu yang lebih dari 0 dihitung nilainya lewat `quote(…, false)` |
| `usePool(user)` | `nav`, `navBand`, `navPerShare`, `totalAssets`, `totalSupply`, `balanceOf`, `unlockTime`, `maxDeposit` |
| `useWithdrawTickets(user)` | event `WithdrawalQueued` dan `WithdrawalClaimed` untuk user, lalu `ticketOf(t)` |
| `useAgentPolicy(owner, agent)` | `policyOf`, `remainingBudget`, `allowedStocks` |
| `useActivity(filter)` | `getLogs` dari blok deploy: Bought, Sold, ShieldBought, SellQueued, Deposit, WithdrawalQueued/Claimed, AgentTrade, PolicySet/Revoked |
| `useTx()` | wrapper `writeContractAsync`, lalu `waitForTransactionReceipt`, lalu decode error, lalu refetch semua query terkait. Mengembalikan state: idle, approving, signing, submitted, confirmed, reverted |

Semua hook memakai `refetchInterval` (misalnya 12 detik) dan `invalidateQueries` setelah tx sukses.

### 4.4 Decode error kontrak

Mapping error ke pesan:

| Error | Pesan UI |
|---|---|
| `SessionBlocksBuys(2)` | Pasar AS tutup. Buy dibuka saat sesi REGULAR/EXTENDED |
| `SessionBlocksBuys(4)` | Saham ini sedang di-halt |
| `Slippage(q, max)` | Harga berubah. Biaya baru {q} melebihi batas {max} |
| `SeriesNotBuyable` | Series ini tidak bisa dibeli sekarang |
| `SeriesUnknown` | Strike tidak tersedia |
| `ShieldExceedsHolding(held, req)` | Kamu hanya memegang {held} saham |
| `Expired` | Deadline transaksi lewat, coba lagi |
| `ERC20InsufficientBalance` | Saldo USDG kurang, ambil di Faucet |
| `ERC20InsufficientAllowance` | Perlu approve dulu |
| Error policy di AgentRouter (budget, expiry, revoked, stock) | Ditolak oleh policy: {alasan} |

### 4.5 Guard network

**Langkah**
Kalau `chainId` bukan 46630, semua tombol tulis dinonaktifkan, banner "Switch ke Robinhood Testnet" muncul (`useSwitchChain`), dan nilai yang dibaca diberi tanda.

**After**
Tidak ada tx yang terkirim ke network yang salah (brief §7: wrong-chain state).

### 4.6 KRITIS: konfigurasi mainnet di web menunjuk kontrak Lemniscate

**Before**
`web/src/config/wagmi.ts` (`ARCUM_CONTRACTS`, chainId 4663) dan `web/src/data/protocol.ts` (`CONTRACT_ADDRESSES`) berisi alamat **Lemniscate** (engine `0x1C1f…4687`, pool `0x67fF…B58A`, agentRouter `0x0Dd8…D0c9`, timelock `0x58c2…a94e`) bersama USDG mainnet asli. Kalau user memakai wallet di chain 4663 dan Live Mode, tombol Buy akan meminta **approve USDG asli ke kontrak orang lain**. Brief §8: "Upstream Engine … reference deployments only. Do not point our product at them by accident."

**Langkah**
1. Hapus semua alamat upstream dari kode web. Alamat itu hanya boleh ada di `deployments/upstream-reference.json`.
2. Sampai Arcum punya deploy mainnet sendiri: chain 4663 di web = **read-only / tidak didukung**. Semua tombol tulis mati, dengan banner "Mainnet Arcum belum live".
3. Tambah cek di CI: build gagal kalau ada alamat dari `upstream-reference.json` di folder `web/`, `app/`, atau `docs` publik (brief §8: "CI must reject unapproved upstream … addresses").

**After**
Tidak mungkin ada dana user yang terkirim ke kontrak Lemniscate lewat UI Arcum.

**Bukti selesai:** grep `0x1C1f41721fe49c8dee117B17De1006817C974687\|0x67fF1306201bCbEBCBB749DcF0cb2686ec11B58A` di `web/src` dan `app/src` kosong, dan screenshot UI di chain 4663 dengan tombol terkunci.

---

## 5. Integrasi per fitur UI (modul → layar)

### 5.1 Trade (Buy Up/Down)

**Before**
Buy on-chain sudah jalan, tapi:
- Biaya, delta, fee dan breakeven dihitung di browser dengan sigma sendiri, bukan `engine.quote`
- Harga stok dari `INITIAL_STOCKS` atau `/v1/stocks` (hardcoded)
- Grid strike tidak diambil dari series yang dilist
- Tidak ada info sesi pasar, sehingga buy di luar jam pasar revert tanpa penjelasan

**Langkah**
1. Pilihan stok, sisi, speed dan strike **diambil dari `useSeriesList()`**. Hanya series yang listed, belum archived, dan buyable yang bisa diklik.
2. Harga dari `usePrice(stock)`, dengan label "mock price (testnet)" dan waktu update.
3. Biaya dari `useQuote(id, units, true)`: `usdg`, `feeUsdg`, `spreadBps`, `dailyCostUsdg`, `breakevenWad`, `sigmaBps`.
4. Badge sesi: REGULAR / EXTENDED / CLOSED / HALTED. Tombol Buy mati saat CLOSED atau HALTED, dengan pesan dari §4.4.
5. `maxCost` = quote × (1 + slippage, default 0,5%), deadline = sekarang + 10 menit.
6. Approve **sejumlah yang diperlukan**, bukan unlimited (brief: "exact approval").
7. Setelah sukses: tampilkan `tokens` dan `usdgPaid` dari event `Bought` di receipt, plus link explorer.
8. Grafik What-If boleh tetap dihitung di browser, dengan label "estimasi (bukan quote kontrak)".

**After**
Angka yang dilihat user sama dengan yang dieksekusi kontrak, dan kegagalan dijelaskan sebelum user membuang gas.

**Bukti selesai:** tx buy, dengan biaya di UI sama dengan `usdgPaid` di event `Bought`.

### 5.2 Positions dan Holding cost

**Before**
Dua posisi palsu hardcoded (`DashboardPage.tsx:167-200`): NVDA UP $140 (25 token, norm 0,985, $74.91, −$3.09) dan TSLA DOWN $240 (10 token, norm 0,992, $58.20, +$4.20). Posisi ini tampil di Live Mode untuk wallet siapa pun.

**Langkah**
1. `usePositions(user)`: untuk setiap series, baca `OptionToken.balanceOf(user)`.
2. Kolom: Asset & Side, Strike, Speed (dari `seriesOf`), Raw Tokens (balance), Norm (`seriesOf(id).norm` / 1e18), Effective Units = tokens × norm, Value = `quote(id, effective, false).usdg`.
3. PnL = Value − total `usdgPaid` dari event `Bought` user untuk series itu, dikurangi `usdgReceived` dari `Sold`. Kalau event tidak bisa dibaca, PnL = `—`.
4. Tombol "Accrue now" memanggil `engine.accrue(id)` (publik), supaya user melihat norm turun on-chain (brief: holding cost).
5. Riwayat norm dari event `Accrued(id, norm, …)` dalam bentuk grafik kecil.
6. Empty state: "Belum ada posisi. Buka posisi pertama di Trade."
7. Tiket sell yang antre (dari event `SellQueued` milik user) tampil di bawah dengan tombol Cancel (`engine.cancelQueued`).

**After**
Positions adalah cermin isi wallet di chain, sama setelah refresh dan di perangkat mana pun.

**Bukti selesai:** buy, refresh, posisi muncul. Wallet baru: kosong. Tx `accrue` mengubah norm yang tampil.

### 5.3 Sell / Close (setelah 3.1)

**Before**
`handleClosePosition` (`:262`) hanya menghapus baris dari state, lalu menampilkan toast "Proceeds credited to wallet" yang palsu.

**Langkah**
1. Input token yang dijual (default semua), lalu `useQuote(id, tokens × norm, false)`.
2. `minProceeds` = quote × (1 − slippage).
3. `engine.sell(id, tokens, minProceeds, deadline, user)`. Sell tidak butuh approve token karena engine yang burn.
4. Kalau receipt berisi `SellQueued`, tampilkan "Sell masuk antrean #{ticket} (pasar di-halt)", lalu tombol Cancel.
5. Toast sukses hanya setelah receipt, berisi `usdgReceived` dari event `Sold`.

**After**
Close benar-benar mengembalikan USDG ke wallet.

**Bukti selesai:** tx `sell`, saldo USDG naik, dan token berkurang.

### 5.4 Shield (setelah 3.3)

**Before**
`handleExecuteShield` (`:273`) hanya mengubah state lokal. Strike = harga × 0,95 (karangan). "95.0% Portfolio Value" dan "~0.71% of Portfolio" hardcoded (`:944-948`).

**Langkah**
1. Baca saldo stock token user (`MockStock.balanceOf`). Kalau 0, tampilkan "Kamu belum memegang {stok}". Di testnet, sediakan tombol "Mint mock {stok}" di Faucet.
2. User memilih persen proteksi. UI menampilkan **strike put weekly yang benar-benar dilist** (dari `shieldList(stock)` atau `useSeriesList` difilter put weekly buyable).
3. Quote dari `engine.quote(id, units, true)`.
4. "% portfolio" dihitung dari saldo × harga `PriceGuard`, bukan angka tetap.
5. `engine.shield(stock, units, pctBelowBps, maxCost, deadline)`.
6. Setelah sukses, posisi put muncul di Positions (§5.2).
7. Teks wajib (brief §3): "Shield membeli proteksi, bukan jaminan lantai harga selamanya. Unit efektif terus berkurang."

**After**
Shield sesuai brief: cek kepemilikan, strike nyata, pembelian terbatas.

**Bukti selesai:** tx `shield` dengan event `ShieldBought`, dan satu percobaan dengan unit melebihi saldo yang ditolak.

### 5.5 Writer Pool: ringkasan dan risiko

**Before**
`INITIAL_POOL_STATS` (`protocol.ts:92-107`): NAV $2.500.000, NAV/share 1,0204, utilisasi 49,7%, dan sebagainya. API `/v1/pool` (`app/src/api/server.ts:107-121`) mengembalikan angka yang **sama persis**. "Risk Cap 35%" dan "$375.000" hardcoded (`DashboardPage.tsx:748,760`).

**Langkah**
Tampilkan dari `usePool`:
- NAV: `nav()`. Band konservatif: `navBand()` (nav, low, high)
- NAV per share: `navPerShare()`
- Total share: `totalSupply()`. Share user: `balanceOf(user)`, dengan nilai `previewRedeem(balance)`
- Liability opsi: `engine.totalLiability()`
- Kapasitas: `capsFor(totalLiability)`, `maxOutstandingBps()`, `maxPerNameBps()`
- Reserve: `Reserve.balance()`
- Hedge: `hedgeEquity()`, `hedgeStale()`. Kalau route kosong: "Hedging disabled (testnet)"
- Lock dan antrean: `unlockTime(user)` dan parameter pool. Teks "24 jam / 72 jam" diganti dengan nilai on-chain

**After**
Writer melihat kondisi pool yang sebenarnya, termasuk risikonya (brief §13: "A pool balance is not proof of solvency").

**Bukti selesai:** setiap angka cocok dengan `cast call` ke fungsi yang sama.

### 5.6 Writer Pool: Deposit (setelah 3.4)

**Before**
`handleDepositPool` (`:281`) hanya menambah angka lokal.

**Langkah**
1. Input jumlah, lalu tampilkan `previewDeposit(amount)` (share yang akan diterima) dan `maxDeposit(user)`.
2. Approve tepat sejumlah itu, lalu `pool.deposit(amount, user)`.
3. Setelah sukses: share baru dan countdown `unlockTime(user)`.
4. Kalau `maxDeposit` = 0 (deposit dijeda atau tidak publik), tombol mati dengan alasannya.

**After**
Deposit nyata, dan share yang diterima diketahui sebelum tanda tangan.

**Bukti selesai:** tx `deposit`, dan share di UI sama dengan event `Deposit`.

### 5.7 Writer Pool: Withdraw dan Claim

**Before**
`handleRequestWithdraw` (`:295`) hanya menampilkan toast "Withdrawal Ticket #17 … 72-hour notice" yang karangan. Tombol Claim tidak ada.

**Langkah**
1. Request: tombol mati sampai `now ≥ unlockTime(user)`. Lalu `pool.requestWithdraw(shares)`. Nomor tiket dan `claimableAt` diambil dari event `WithdrawalQueued` di receipt.
2. Daftar tiket: `useWithdrawTickets(user)`, berisi status Pending (countdown ke `claimableAt`), Claimable, atau Claimed (dari `WithdrawalClaimed`).
3. Claim: `pool.claim(ticket)`. Tampilkan USDG yang dibayar dari event. Kalau lebih kecil dari estimasi, tampilkan "pembayaran parsial, sisa tetap tercatat" (brief §13).
4. Teks: "Nilai dihitung saat claim, bukan saat request."

**After**
Alur keluar writer lengkap dan nyata: request, tunggu, claim.

**Bukti selesai:** tx `requestWithdraw` dan `claim`, dengan event `WithdrawalClaimed`.

### 5.8 Agents (setelah 3.5)

**Before**
`INITIAL_AGENT_POLICY` (`protocol.ts:109-119`): agent `0x8b32…5001`, budget $5.000, terpakai $1.250. Revoke hanya toggle lokal. Tombol `npx -y @arcum/mcp` mengarah ke paket yang **tidak ada di npm** (404). Docs mengklaim "MCP & ERC-4337".

**Langkah**
1. Form policy: alamat agent, budget, max per trade, expiry, canSell, canShield, daftar stok. Kirim lewat `agentRouter.setPolicy(...)`.
2. Approve USDG ke AgentRouter **sebesar budget**.
3. Panel policy aktif dari `policyOf(owner, agent)`, `remainingBudget`, `allowedStocks`. Status: Aktif / Kedaluwarsa / Dicabut.
4. Revoke: `agentRouter.revoke(agent)`.
5. Riwayat dari event `AgentTrade` (owner = user).
6. MCP: tampilkan perintah yang **benar-benar jalan** dari repo (`app/src/mcp`), dengan config yang memakai alamat dari manifest. Sembunyikan `npx @arcum/mcp` sampai paketnya dipublish.
7. Hapus klaim ERC-4337 di Docs, atau ganti dengan "Account abstraction: belum aktif" (lihat §7).

**After**
Klaim "agent dengan policy on-chain" punya bukti, dan tidak ada klaim fitur yang belum ada.

**Bukti selesai:** tx `setPolicy`, `buyFor` (sukses), `buyFor` (ditolak karena melebihi budget atau stok tidak diizinkan), `sellFor`, dan `revoke`, lalu `buyFor` setelah revoke (ditolak).

### 5.9 Activity

**Before**
3 baris hardcoded dengan nomor blok karangan (`DashboardPage.tsx:1100-1111`).

**Langkah**
1. `useActivity()` lewat `getLogs` dari blok deploy, atau Blockscout `/api/v2/addresses/{addr}/logs` untuk engine, pool dan router.
2. Dua tab: "Aktivitasku" (filter address user) dan "Protokol" (semua).
3. Setiap baris berisi jenis, jumlah, waktu blok, dan link ke tx.
4. Empty state.

**After**
Riwayat nyata yang bisa diverifikasi di explorer.

**Bukti selesai:** setelah satu buy, baris baru muncul dan link-nya membuka tx yang benar.

### 5.10 Fees dan Reserve

**Before**
Hanya teks "80/10/5/5 Protocol Fee Waterfall" di Docs. Tidak ada angka.

**Langkah**
Panel kecil di tab Pool atau halaman Protocol:
- `FeeRouter.distributable()` dan tombol publik `distribute()`
- Riwayat `Distributed(amount, toPool, toKeepers, toHedger, toTreasury, toStakers, toBurn)`
- `Reserve.balance()` dan event `Covered`
- Event `IncomeSplit` dari pool

Split persentase dibaca dari event `SplitSet` dan `WorkerSplitSet`, bukan ditulis "80/10/5/5".

**After**
Fee dan reserve bisa direkonsiliasi (brief §15), bukan sekadar klaim.

**Bukti selesai:** tx `distribute`, dan angka di UI sama dengan event.

### 5.11 Settings dan Network

**Before**
RPC mainnet ditampilkan saat app di testnet. Wrong-chain tidak memblokir aksi.

**Langkah**
Tampilkan chain ID, RPC, explorer, dan versi manifest (blok deploy, commit) dari `getContracts(chainId)`. Guard dari §4.5.

**After**
User tahu persis network dan versi kontrak yang dipakai.

### 5.12 Docs dan Contracts

**Before**
Ada baris Timelock palsu, ditambah teks "48-hour Timelock", "24h lock / 72h queue", "Uniswap V3 TWAP Anti-Sandwich", dan "ERC-4337" yang tidak sesuai kondisi testnet.

**Langkah**
1. Tabel diisi dari manifest. Tambah SeriesRegistry, PriceGuard, WriterPool impl, dan mock token dengan label "mock".
2. Kolom "Status": Live / Disabled (testnet) / Not deployed.
3. Kolom "Verified" (dari Blockscout API `is_verified`).
4. Teks fitur menyesuaikan status: TWAP, hedging, timelock dan AA ditandai "belum aktif di testnet".

**After**
Docs jujur tentang apa yang live.

**Bukti selesai:** semua tombol Explorer membuka alamat berisi kontrak.

### 5.13 Faucet

**Before**
Sudah on-chain (`MockUSDG.mint` 1.000 USDG).

**Langkah**
Tambah tombol mint mock stock (NVDA dan lainnya) untuk menguji Shield. Tampilkan saldo setelah mint dari `balanceOf`.

**After**
Tester bisa menjalankan semua alur, termasuk Shield, tanpa bantuan dev.

### 5.14 Exit

**Before**
Halaman dan unduhan ada, tapi isinya perlu dicek terhadap alamat terbaru.

**Langkah**
Generate dari manifest. Isi: cara `sell` / `cancelQueued` lewat explorer "Write contract", `requestWithdraw` / `claim`, dan cek approval. Butuh source **verified** (3.6) supaya tab Write di explorer muncul.

**After**
User bisa keluar tanpa web Arcum (brief §20).

---

## 6. Daftar TAKEOUT: semua hardcode

**Aturan:** dihapus dari Live Mode dan diganti data chain atau `—`. Angka contoh untuk Demo dipindah ke `web/src/data/demoFixtures.ts`, yang hanya di-import saat `demoMode === true`.

### A. Data user, pool, agent (kritis)

| # | Lokasi | Hardcode | Pengganti |
|---|---|---|---|
| H1 | `web/src/pages/DashboardPage.tsx:167-200` | 2 posisi palsu NVDA UP $140 dan TSLA DOWN $240, dengan `seriesId` karangan `0x4e5644…0001` | `usePositions` (§5.2) |
| H2 | `web/src/data/protocol.ts:92-107` `INITIAL_POOL_STATS` | NAV $2,5 jt, shares 2,45 jt, NAV/share 1,0204, liability $435 rb, kapasitas $875 rb, utilisasi 49,7%, cash $1,85 jt, hedge $580 rb, reserve $125 rb | `usePool` (§5.5) |
| H3 | `app/src/api/server.ts:107-121` `/v1/pool` | Angka yang sama dengan H2, plus APR 18,4%, lock 24 jam, notice 72 jam | API membaca kontrak, atau dihapus |
| H4 | `web/src/data/protocol.ts:109-119` `INITIAL_AGENT_POLICY` | Agent `0x8b32…5001`, budget $5.000, terpakai $1.250, max $500, NVDA/TSLA/AAPL | `useAgentPolicy` (§5.8) |
| H5 | `DashboardPage.tsx:1100-1111` | Activity: Block #18,942,109 / #18,935,441 / #18,930,012 | `useActivity` (§5.9) |
| H6 | `DashboardPage.tsx:295-300` | "Withdrawal Ticket #17 … 72-hour notice" | Event `WithdrawalQueued` |
| H7 | `DashboardPage.tsx:262-290` | Handler Close/Shield/Deposit yang mengubah state dan menampilkan toast sukses tanpa tx | `useTx` (§4.3), toast setelah receipt |

### B. Pasar dan risiko

| # | Lokasi | Hardcode | Pengganti |
|---|---|---|---|
| H8 | `web/src/data/protocol.ts:44-90` `INITIAL_STOCKS` | Harga 142,50 / 248,80 / 585,20 / 498,40 / 226,75, `change24h` +3,42 / −1,15 / +0,65 / +1,12 / +0,45 | `usePrice`. `change24h` dihapus |
| H9 | `app/src/api/server.ts:123-150` `/v1/stocks` | Sama dengan H8 | Sama dengan H8 |
| H10 | `DashboardPage.tsx:748` | "Risk Cap: 35.0% NAV" | `maxOutstandingBps()` |
| H11 | `DashboardPage.tsx:760` | "$375,000 USDG" | `capsFor(...)` |
| H12 | `DashboardPage.tsx:940-948` | Strike × 0,95, "95.0% Portfolio Value", "~0.71% of Portfolio" | §5.4 |
| H13 | `web/src/pages/ProductsPage.tsx:141` | "18.4% APY Target" | Hapus |
| H14 | `DashboardPage.tsx` sekitar 640-700 (`currentQuote`) | Quote dihitung di browser | `useQuote` (§5.1) |

### C. Konfigurasi dan teks

| # | Lokasi | Hardcode | Pengganti |
|---|---|---|---|
| H15 | `DashboardPage.tsx:709` | Fallback `0x71C8...a49B` | "Not connected" |
| H16 | `App.tsx` | `0x71C8...Demo` | Hanya di Demo, dengan badge |
| H17 | Settings sekitar `:1130` | RPC mainnet | §5.11 |
| H18 | Tab Agents sekitar `:1074` | `npx -y @arcum/mcp` (404 di npm) | §5.8 langkah 6 |
| H19 | `protocol.ts:21-42`, `wagmi.ts:55-80` | Alamat manual, termasuk Timelock `0x68c276…` (kosong) | §4.1 |
| H20 | Docs, Products, Pool | "24-hour lock", "72-hour notice", "48-hour Timelock", "ERC-4337", "Uniswap V3 TWAP Anti-Sandwich" sebagai fitur aktif | §5.12 dan §7 |
| H21 | `DocsPage.tsx:45` | "1-Click **Automated** Shield" | Shield manual dengan strike yang dilist. Hapus "Automated" sampai ada otomatisasi |

### Cek setelah takeout

```bash
cd web/src
grep -rnE "74\.91|58\.2|2500000|2450000|18\.4|375,000|18,942,109|Ticket #17|0x8b32A4A8|change24h: [0-9-]|0x68c276|@arcum/mcp" . \
  | grep -v demoFixtures
# hasil harus kosong
```

Lalu buka `/positions`, `/pool`, `/agents` dan `/activity` dengan **wallet baru** di Live Mode. Semua harus kosong atau `—`.

---

### D. Services, MCP, script, dan laporan di repo

Bagian ini di luar `web/`, tapi ikut menampilkan atau mengklaim data yang tidak nyata.

| # | Lokasi | Before | Langkah / After |
|---|---|---|---|
| H22 | `app/src/keeper/keeper.ts` | Keeper hanya menghitung norm **di memori** (`s.norm = s.norm * decayFactor`) dan tidak pernah memanggil kontrak. Norm on-chain tidak pernah di-accrue oleh service | Keeper memanggil `engine.accrueMany(ids)` dan `fillQueued(ticket)` on-chain dengan **key khusus keeper** (bukan key deployer), punya interval, retry, dan log tx hash. Testnet: cukup cron tiap jam |
| H23 | `app/src/indexer/indexer.ts` | Event disimpan di array memori (`eventStore.push`), tanpa membaca chain | Membaca `getLogs` dari blok deploy, menyimpan checkpoint blok, tahan restart. Alternatif untuk testnet: hapus, dan web membaca log langsung (§4.3 `useActivity`) |
| H24 | `app/src/hedger/hedger.ts` | Tidak ada transaksi on-chain | Tandai disabled (§7). Jangan dijalankan atau diklaim |
| H25 | `app/src/mcp/tools.ts:185-186` | `poolAddress` = pool **Lemniscate** `0x67fF…B58A`, `settlementAsset` = USDG mainnet | Ambil dari manifest sesuai chain. Testnet: pool dan USDG mock 46630 |
| H26 | `app/src/mcp/tools.ts:248` | Fallback `agentRouterAddress` hardcoded | Dari manifest. Error jelas kalau env tidak di-set |
| H27 | `scripts/agent_quickstart.ts` | Mencetak "Policy Status: ACTIVE (Verified on AgentRouter.sol)" dan "Transaction Broadcast: 0x8f4c…", padahal keduanya **teks tetap** di kode | Ganti dengan panggilan nyata (`setPolicy`, `buyFor` di testnet, cetak tx hash dari receipt), atau hapus script |
| H28 | `scripts/mainnet_dry_run.py`, `scripts/canary_mainnet_fork.py`, `scripts/qa_full_suite_runner.py`, `deployments/mainnet_dry_run_report.json`, `canary_staging_report.json`, `chaos_drills_report.json` | Output dan laporan "sukses" tanpa transaksi atau deployment yang mendasarinya | Hapus, atau beri header "SIMULASI, bukan bukti deployment". Jangan dirujuk di README atau Docs sebagai bukti |
| H29 | `audit_arcum.md`, laporan QA "22/22", `HANDOVER_PACKAGE.md` | Mengklaim status (lulus, verified, siap) yang tidak sesuai kondisi chain | Diperbarui setelah E1–E22 (§11), dengan tx hash sebagai bukti. Brief §5: AI pre-audit bukan audit independen |

---

## 7. Modul yang tidak diaktifkan di testnet (status jujur)

Brief §4: "A module in source is not automatically a live feature", dan §16: "publish our actual capability status". Modul di bawah **tidak** perlu dibangun penuh untuk tahap testnet ini, tapi UI wajib menampilkan statusnya dengan benar.

| Modul | Kondisi | Yang ditampilkan di UI | Syarat untuk diaktifkan |
|---|---|---|---|
| CoveredUpVault, CashDownVault, VaultRegistry | Ada di `src/`, ada tes, tidak di-deploy | "Later-phase: belum aktif" | Deploy, `pool.setVaultHook`, tes activation checklist |
| ArcumStaking, ArcumBuyBurn | Ada di `src/`, tidak di-deploy, belum ada token | "Later-phase: belum aktif" | Keputusan token dari owner (brief §25) |
| VolOracle | Tidak ada | "Sigma: di-set manual (testnet)" | Kontrak, signer, pipeline `vol-engine` |
| MarketHours (kalender NYSE) | Sesi dari PriceGuard | Badge sesi dari `read().session` | — |
| Hedging dan TWAP | Tanpa route atau factory | "Disabled (testnet)" | Ada pool Uniswap di testnet |
| Timelock | Tidak ada | Tidak ditampilkan, atau "Owner: EOA deployer (testnet)" | Deploy TimelockController |
| Account abstraction (ERC-4337, paymaster) | Tidak ada | "Belum aktif. Pakai wallet biasa" | EntryPoint, factory, paymaster |
| Writer rewards | Tidak ada | Tidak ditampilkan | Program reward disetujui |
| Invitation/region control | Tidak ada | Tidak ditampilkan | Keputusan owner |

Di halaman Contracts dan Docs tambahkan satu tabel **"Capability status"** berisi daftar di atas. Ini pengganti klaim fitur di Docs yang sekarang.

---

## 8. x402: dikeluarkan dari scope

**Keputusan:** x402 (paid data / pembayaran per-call untuk agent) **tidak dikerjakan** pada tahap ini. Keputusan ini dibuat oleh owner pada 13 Nov 2026.

**Before**
Brief §4 dan §16 memasukkan x402 (challenge pembayaran, cap, retry, penolakan replay). Di repo dan web tidak ada implementasinya, dan tidak ada klaimnya di UI.

**Konsekuensi untuk dev:**
1. Jangan menambah kode, endpoint, atau teks x402 di web, API, maupun MCP.
2. Tabel Capability status (§7) mencantumkan: "x402 paid data: di luar scope".
3. Endpoint MCP dan API yang membaca data tetap **gratis** untuk testnet.
4. Skenario acceptance brief §24 nomor 10 ("AA/x402 paths…") dianggap **tidak berlaku untuk x402**. Untuk AA cukup status "belum aktif" yang akurat.
5. Kalau nanti x402 diaktifkan kembali, budget pembayaran data dipisah dari budget trading agent (brief §16), dan itu akan menjadi dokumen tersendiri.

Owner: tolong perbarui juga `ARCUM_ROBINHOOD_DEV_BRIEF.md` §4 dan §16 supaya selaras dengan keputusan ini.

---

## 9. Rute halaman yang belum ada

Kerjakan setelah §3 sampai §6. Halaman informasional boleh statis, tapi angka di dalamnya mengikuti aturan §0.

| Rute (brief §7) | Kondisi | Isi |
|---|---|---|
| Tab `overview` | Tidak ada | Saldo USDG, total nilai posisi, share pool, policy agent aktif, 5 aktivitas terakhir (semua dari hook §4.3) |
| `/protocol` | Dialihkan ke tab activity | Arsitektur, capability status (§7), fee dan reserve (§5.10) |
| `/writers` | Dialihkan ke tab pool | Penjelasan writer: risiko, NAV, lock, antrean, claim |
| `/costs` | Tidak ada | Biaya harian (norm), fee 3 bps, spread 15/25 bps (dari kode engine, atau tampilkan nilai on-chain kalau sudah ada getter) |
| `/markets/upside`, `/markets/shield`, `/markets/daily-and-weekly`, `/markets/writer-pool` | Tidak ada | Penjelasan per produk |
| `/learn/everlasting-options`, `/learn/daily-holding-cost`, `/learn/shield-protection`, `/learn/stock-token-pricing` | Hanya `/learn` | 4 subhalaman |
| `/privacy`, `/product-terms` | Tidak ada | Menunggu entitas dan kebijakan dari owner. Sementara tampilkan "Draft: belum berlaku" |

---

## 10. State UI wajib di setiap alur

Brief §7 meminta state berikut. Kolom yang dicentang wajib ada di fitur itu.

| State | Trade | Positions/Sell | Shield | Deposit | Withdraw/Claim | Agents |
|---|---|---|---|---|---|---|
| Disconnected | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Wrong chain | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Loading | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Empty | | ✓ | ✓ (tidak memegang saham) | | ✓ (tidak ada tiket) | ✓ (tidak ada policy) |
| RPC/API tidak tersedia | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Data stale (`fresh = false`) | ✓ | ✓ | ✓ | | | |
| Pasar tutup / halt | ✓ | ✓ (sell antre) | ✓ | | | |
| Kapasitas atau likuiditas habis | ✓ | ✓ | ✓ | ✓ (`maxDeposit` = 0) | ✓ (parsial) | |
| Approval | ✓ | | ✓ | ✓ | | ✓ |
| Menunggu tanda tangan | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submitted | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Confirmed (dengan link explorer) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reverted (dengan pesan §4.4) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Queued | | ✓ | | | ✓ | ✓ |
| Claimable | | | | | ✓ | |
| Partial payment | | | | | ✓ | |

---

## 11. Uji end-to-end testnet

Jalankan dengan **wallet baru** di `arcum-f2tc.vercel.app` (Live Mode, chain 46630), saat jam pasar AS (21:30–04:00 WIB untuk sesi REGULAR). Catat setiap tx hash.

| # | Skenario | Hasil yang diharapkan |
|---|---|---|
| E1 | Buka semua tab dengan wallet baru | Semua kosong atau `—`. Tidak ada angka contoh |
| E2 | Faucet USDG 1.000 dan mock NVDA | Tx `mint`, saldo bertambah |
| E3 | Coba buy di luar jam pasar | Tombol mati atau pesan "pasar tutup", tanpa tx revert |
| E4 | Buy NVDA Up $141, 10 unit | Tx `approve` (sejumlah yang diperlukan) dan `buy`, dengan biaya = quote |
| E5 | Refresh, lalu buka Positions | Posisi tampil dengan norm dari chain |
| E6 | Tekan Accrue, tunggu, refresh | Norm turun, event `Accrued` |
| E7 | Sell setengah | Tx `sell`, USDG kembali, event `Sold` |
| E8 | Shield NVDA 5% | Tx `shield` dengan strike dari series yang dilist |
| E9 | Shield melebihi saldo NVDA | Ditolak dengan pesan |
| E10 | Deposit 100 USDG ke pool | Tx `deposit`, share = preview |
| E11 | Tunggu unlock, request withdraw | Tx `requestWithdraw`, tiket dari event |
| E12 | Tunggu claimable, lalu claim | Tx `claim`, sekitar 100 USDG kembali (setelah 3.4) |
| E13 | Set policy agent (budget 20, max 5, NVDA saja) | Tx `setPolicy` |
| E14 | Agent `buyFor` NVDA 1 unit | Tx sukses, `remainingBudget` turun |
| E15 | Agent `buyFor` TSLA | Ditolak (stok tidak diizinkan) |
| E16 | Agent `buyFor` melebihi max per trade | Ditolak |
| E17 | Agent `sellFor` | Proceeds masuk ke **owner** |
| E18 | Revoke, lalu agent `buyFor` | Ditolak |
| E19 | `FeeRouter.distribute()` | Event `Distributed`, angka di UI cocok |
| E20 | Activity tab | Semua tx E2–E19 muncul dengan link yang benar |
| E21 | Ganti wallet ke chain lain | Semua tombol aksi terkunci |
| E22 | Buka `/exit`, ikuti panduan sell lewat explorer | Bisa dijalankan tanpa web Arcum (butuh verified source) |

| E23 | Wallet di chain 4663 (mainnet) | Banner "Mainnet Arcum belum live", tidak ada tombol approve/buy (§4.6) |
| E24 | Keeper berjalan 2 jam | Ada tx `accrueMany` dari alamat keeper di explorer, dan norm di Positions ikut turun |
| E25 | Tutup tab, buka `/exit`, cek approval | Daftar allowance USDG user ke engine, pool, dan router, dengan cara mencabutnya (`approve(spender, 0)`) |
| E26 | Mobile (lebar 390 px) | Semua alur E2–E18 bisa diselesaikan di HP |

Simpan hasilnya di `docs/TESTNET_E2E_EVIDENCE.md` dengan kolom: skenario, tx hash, link explorer, hasil, catatan.

### Otomasi

Tambah Playwright e2e di `web/` dengan wallet injeksi (private key testnet khusus QA, disimpan di secret CI, bukan di repo) untuk E1, E4, E5, E7, E10 dan E21. Tes harus berjalan terhadap **testnet asli**, bukan mock RPC, minimal sekali sebelum rilis.

---

## 12. Urutan kerja dan Definition of Done

| Tahap | Pekerjaan | Bukti |
|---|---|---|
| 0 | §4.6 kunci mainnet di web (hapus alamat Lemniscate). **Kerjakan hari ini**, karena web sudah live di Vercel | Grep kosong dan screenshot |
| 1 | §3.1–3.8 perbaikan kontrak, hapus cheat di tes, fork test baru | Output `forge test`, termasuk fork test |
| 2 | Redeploy testnet, `46630.json` baru, verify semua source | Tx deploy dan badge verified |
| 3 | §4 fondasi web (manifest, ABI, hook, error, guard) | PR yang menghapus `protocol.ts` dan alamat di `wagmi.ts` |
| 4 | §6 takeout semua hardcode | Hasil grep kosong, screenshot wallet baru |
| 5 | §5.1–5.3 Trade, Positions, Sell | E3–E7 |
| 6 | §5.4–5.7 Shield dan Pool | E8–E12 |
| 7 | §5.8 Agents | E13–E18 |
| 8 | §5.9–5.14 Activity, Fees, Settings, Docs, Faucet, Exit, plus §7 capability status | E19–E22 |
| 9 | §9 rute yang belum ada | Daftar URL |
| 9b | §6.D services (keeper on-chain, indexer, MCP dari manifest), takeout script dan laporan palsu | Tx keeper di explorer, grep alamat upstream kosong |
| 10 | Isi `docs/TESTNET_E2E_EVIDENCE.md`, plus Playwright | 26 baris dengan tx hash, laporan Playwright |

**Definition of Done tahap testnet:**
- [ ] Semua tes Foundry, Bun dan Pytest lulus, termasuk tes baru di tahap 1
- [ ] Semua kontrak di `46630.json` verified di Blockscout
- [ ] `pool.engine()` = engine. Round-trip deposit/claim tidak rugi lebih dari pembulatan
- [ ] Grep takeout kosong
- [ ] Wallet baru melihat semua halaman kosong di Live Mode
- [ ] Tidak ada `vm.prank(pool)` atau cheat sejenis yang menutupi wiring. Fork test terhadap `46630.json` lulus
- [ ] Tidak ada alamat Lemniscate di `web/src` dan `app/src`. Chain 4663 terkunci di UI
- [ ] Keeper mengirim `accrueMany` on-chain dengan key keeper sendiri
- [ ] E1–E26 lulus dengan tx hash
- [ ] Capability status tampil, x402 tercatat di luar scope, tanpa klaim AA/TWAP/timelock yang tidak aktif
- [ ] Tidak ada alamat di UI yang `cast code`-nya `0x`

Setelah semua centang, panduan rekaman (`PANDUAN_RECORD_ARCUM.md`) bisa membuka klip testnet T1–T6.
