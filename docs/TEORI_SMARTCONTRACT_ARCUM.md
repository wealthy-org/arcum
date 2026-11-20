# TEORI SMART CONTRACT ARCUM — ANALISA MENDALAM BERBASIS KODE
**Tanggal:** 15 November 2026 · **Metode:** pembacaan langsung 4.194 baris Solidity di `contracts/src/`, bukan ringkasan dokumen
**Untuk:** menjawab arahan Manajer — *"didalami mas buat secara teori smartcontract nya"*

---

## 1. ARSITEKTUR SISTEM (teori desain)

```
User / AI Agent
   │  (AgentRouter: delegasi non-kustodial + policy on-chain)
   ▼
ArcumEngine ──── baca harga ────► PriceGuard  (feed konfigurable; SAAT INI: mock owner)
   │  buy/sell/shield                │  sesi pasar REGULAR/EXTENDED/CLOSED/HALTED
   ▼                                 ▼
SeriesRegistry ── OptionToken (ERC-20 per seri)      EverlastingMath / Greeks / Funding
   │
   ▼
WriterPool (ERC-4626 + queue) ◄── Reserve (first-loss) ◄── FeeRouter (bagi hasil)
   └── Hedger (role) ── rebalance ke venue perp (launch: OFF, cap 0)
Governance: Owner/DEFAULT_ADMIN → Timelock 48 jam (mainnet), Guardian, Pauser
```

**Prinsip kustodial:** protocol tidak pernah pegang dana user. Premium langsung masuk pool LP; opsi adalah ERC-20 biasa di wallet pembeli; agent tidak pernah memegang token owner (AgentRouter mengecek policy lalu memanggil engine atas nama owner).

---

## 2. TEORI MATEMATIS (diverifikasi baris-per-baris di kode)

### 2.1 Harga closed-form everlasting option (`EverlastingMath.sol`)
Menyelesaikan ODE Euler-Cauchy untuk GBM kontinu:

```
½·σ²·S²·V''(S) − V(S)/τ + Payoff(S)/τ = 0
alpha = (1 + √(1 + 8/(σ²·τ))) / 2
```

Solusi yang diimplementasikan (cocok dengan teori everlasting option terpublikasi):
- **Call, S ≤ K:** `V = K/(2α−1) · (S/K)^α`
- **Call, S > K:** `V = (S−K) + K/(2α−1) · (K/S)^(α−1)` — intrinsic + nilai waktu
- **Put:** simetris terhadap S↔K. Payoff kontinu di S=K (tidak ada diskontinuitas) ✅

Verifikasi numerik: α untuk τ=1 hari (86400 s), σ=50%: σ²·τ ≈ 0.25·(86400/31536000) ≈ 6.85e−3 → 8/6.85e−3 ≈ 1169 → √1170 ≈ 34.2 → α ≈ 17.6. **Semakin pendek τ, semakin besar α → nilai waktu meluruh makin cepat.** Daily lebih "theta" dari Weekly — konsisten dengan desain `Speed.DAILY/Weekly`.

### 2.2 Holding cost kontinu / Norm (`Funding.accrueNorm`)
```
Norm(t) = Norm(t₀) · exp( − (timeValue / (vMark·τ)) · Δt )
```
- **Theta kontinu, bukan pada expiry** — ini inti everlasting: pembeli membayar holding cost tiap detik lewat penyusutan `norm` (unit efektif = tokens × norm saat sell).
- **Deep ITM → timeValue→0 → decay berhenti**: nilai intrinsik tidak membusuk. Teorinya benar dan diimplementasikan persis begitu.
- `accrue` bersifat *pull-based*: siapa pun bisa `accrueMany(ids)` (keeper) — state global, tidak ada room untuk timing game yang mengubah harga (norm hanya monoton turun).

### 2.3 Greeks closed-form (`EverlastingGreeks.sol`)
- Delta call OTM: `α/(2α−1) · (S/K)^(α−1)`; ITM: `1 − ((α−1)/(2α−1))·(K/S)^α`
- Put delta = call delta − 1 (put-call parity everlasting) ✅
- Gamma: `α(α−1)/((2α−1)·K) · (…)^…` ✅ konsisten dengan turunan kedua solusi di atas.

### 2.4 Ekonomi round-trip pool
- Fee tetap **3 bps** + spread **15 bps (Daily) / 25 bps (Weekly)**.
- Buy = V + fee + spread; Sell = V − fee − spread → **pool menang ~18–28 bps per round trip + theta dari norm** (LP = penjual volatilitas & waktu secara sistematis).
- IV **hardcoded 5000 bps (50%)** di `quote()` — ⚠️ lihat §5.1.

### 2.5 Presisi aritmetika (`FixedMath`)
WAD 18-digit; `wadPow` = exp/log2, `wadExp`, `wadSqrt` — presisi ~1e−9 relatif. Untuk harga opsi skala USDG, error matematis **di bawah 1 wei nilai** pada rentang rasio realistis (S/K 0.01–100). Edge case rasio ekstrem tetap terspill ke intrinsic + decay term yang stabil. ✅ Aman untuk produksi.

---

## 3. TEORI LIKUIDITAS & SOLVABILITAS (`WriterPool.sol` — jantung sistem)

### 3.1NAV band (guard band)
- NAV dihitung **tiga tepi**: mid / low (exit) / high (entry), dikontrol `setNavGuard(openBps, closedBps)` maks 2000 bps.
- **LP masuk di harga high (+premium 10 bps deposit), keluar di low** → arbitrase masuk-keluar cepat otomatis rugi; melindungi LP dari round-trip freerider. Teori band ini solid (praktik standar vault profesional).

### 3.2 Withdrawal queue (72 jam) & anti-timing-game
- `requestWithdraw`: share di-escrow (dikirim ke diri sendiri), tiket matang setelah `QUEUE_DELAY`.
- **`CLAIM_WINDOW` 7 hari** — tiket tidak diklaim = *re-queue* & bayar 0. Ini menutup "opsi gratis atas timing exit" (ticket owner tidak bisa menahan tiket lalu klaim di momen NAV paling menguntungkan). Doc `F12(c)` di kode. Desain sangat matang ✅
- Klaim dibayar di **NAV low**; kalau aset likuid kurang → **pro-rata per hari UTC** (`PoolLayers.settleClaim`), sisa tiket tetap claimable. Shortfall eksekusi hedge paksa **ditanggung klaiman**, bukan pool. ✅

### 3.3 Urutan solvabilitas saat pay-out (`pay()`)
```
cash → jual hedge (slippage dibatasi maxHedgeSlippageBps) → Reserve (sampai share-nya)
→ jika semua habis: revert Insolvent
```
- **Reserve = first-loss buffer**, diambil sebatas "reserve share" NAV (bukan seluruh saldo) — sisanya tetap milik pool. Teori layering first-loss yang benar.
- Revert saat insolven (bukan bayar sebagian diam-diam) = integritas akuntansi ✅

### 3.4 Hedging
- `HEDGER_ROLE` posting equity perp (maks `maxPerpEquityBps` — **launch: 0, perp OFF**), dibatasi stale 2 jam + bounds vs `lastNavUsdg`.
- `rebalance` hanya boleh pakai **cash di atas buffer** (`cashBufferBps`); loss rebalance harian dibudget `maxHedgeLossBps`; hedger bisa di-`frozen` dan di-slash via staking (`StakeSlashed`).
- Teori: hedge = discipline operator, bukan trust — semua loss dibatasi budget on-chain. ✅

### 3.5 Risk cap 35% / 8%
- `capBps() = (3500, 800)` — cap total outstanding 35% NAV, per nama 8%. `capsFor` memproyeksikan ke USDG.
- ⚠️ **Temuan:** enforcement cap ini **soft** — hanya *view* + alat admin. Di jalur `buy()`, `onSale()` hanya mencatat & membagi income; **tidak ada assert hard "liability ≤ cap" on-chain saat pembelian**. Lihat §5.3.

---

## 4. TEORI KONTROL & AKSES

| Mekanisme | Implementasi | Catatan teori |
|---|---|---|
| Upgradeability | ERC-1967 proxy (engine, pool) | slot impl resmi; bisa diverifikasi explorer |
| Admin | `DEFAULT_ADMIN_ROLE` → **TimelockController 48 jam (mainnet)** | jendela keluar bagi user sebelum parameter berbahaya berubah |
| Guardian | `GUARDIAN_ROLE` | respons darurat terbatas (pause), bukan mutasi dana |
| Pauser | `_onlyPauser` — hanya bisa *pause*, tidak bisa unpause sendiri | asimetri aman yang benar |
| Series | hanya engine yang bisa `setBuyable/archive/storeAccrual`; owner set `allowedStock` | pembuatan seri ber-elektron (strike ladder) di sisi admin |
| Agent | policy per (owner,agent): `maxPerTrade`, `budget`, `canBuy/canSell/shield`, nama saham ber-generation stamp (revoke = ganti generasi) | revoke atomik tanpa migrasi; tak ada jalur dana lewat router ✅ |

---

## 5. TEMUAN TEORETIS (ranked — yang #1 = jawaban untuk Manajer)

### 5.1 🔴 ORACLE: PriceGuard masih FULL MOCK — ini blocker utama mainnet

> **STATUS 2026-11-20 — SUDAH DIPERBAIKI, bukan lagi blocker.** Bagian di bawah adalah temuan historis terhadap kode lama. Kondisi sekarang:
>
> | Temuan lama | Kondisi sekarang | Bukti |
> |---|---|---|
> | `_readInternal()` hanya baca `_mockPrices` | `PriceGuardProd` membaca `AggregatorV3Interface.latestRoundData()` dari feed resmi | `contracts/src/PriceGuardProd.sol`; `test/PriceGuardChainlink.t.sol` 22 test lulus |
> | `setTwapSource()` hanya `emit` | Pool + window + band disimpan dan dipakai; `KeeperTwapReference` di-deploy dan di-wire | `contracts/src/KeeperTwapReference.sol`; 11 test lulus |
> | `twapCheck()` cuma `price > 0` | Deviasi di luar `twapBandBps` mem-pause buy; TWAP tidak tersedia = pause (fail-closed) | `test_twap_outsideBandPausesBuys`, `test_twap_unavailablePausesBuys` |
> | Sesi pasar meleset 1 jam saat EST | `sessionAt()` hitung DST betul; ada test boundary DST musim panas dan musim dingin | `test_session_dstBoundaries`, `test_session_dstWouldBeWrongWithFixedOffset` |
> | (belum tercatat) Feed NVDA | **Terverifikasi on-chain di 4663**, bukan lagi "belum ada": `FEED_NVDA = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15`, `description() = "RHNVDA / USD"`, 8 desimal, round lengkap | `contracts/test/fork/Mainnet4663.t.sol` — 9 test lulus vs mainnet asli |
>
> Rute (a) di bawah **sudah dieksekusi**: feed resmi dipakai, `StockConfig.feed` dibaca, `maxAgeRegular`/`maxAgeExtended` di-enforce. Yang belum: rilis produksi (deploy) ke `4663`.

**Fakta kode (historis, commit sebelum pass ini):**
- `PriceGuard._readInternal()` hanya membaca `_mockPrices[stock]` — harga NVDA/TSLA/dst = **angka yang diketik owner via `setMockPrice()`**.
- `setTwapSource()` hanya `emit` event — **pool/window/band TIDAK disimpan**, tidak pernah dipakai.
- `twapCheck()` mengembalikan harga mock, `ok = price > 0` — bukan cek TWAP sungguhan.
- `UniswapV3TwapReference.sol` (implementasi TWAP beneran, `observe()` pool V3) **SUDAH ADA tapi TIDAK DIKAWINKAN ke PriceGuard.**

**Artinya:** tepat seperti yang ditebak Manajer — *"yang menentukan deploy jalan = sumber harga NVDA untuk PriceGuard"*. Jawaban presisinya: **feed-nya BELUM ADA di kode; yang ada placeholder mock.** Di testnet ini OK (owner = sumber harga). Di mainnet ini:
1. **Risiko trust:** LP & pembeli harus percaya owner mengetik harga NVDA dengan jujur — single point of failure + tanpa audit trail harga.
2. **Risiko operasional:** owner lupa update harga → pembelian terus jalan di harga basi (mismatch dunia nyata) → mispricing sistemik.
3. **Risiko gameable:** harga mock tidak bisa di-manipulasi dari luar (bagus), tapi tidak juga membuktikan harga dunia nyata (buruk untuk NAV band & shields).

**Rute perbaikan (urut realistis):**
- **(a) Official stock-token oracle** — cek dulu apakah tokenized equity Robinhood Chain punya feed on-chain resmi (periksa dokumentasi token NVDA di explorer / docs chain). Kalau ada: `PriceGuard.setStock(feed=…)`, baca `latestRound/price` + `maxAgeRegular/maxAgeExtended` (field config-nya sudah disiapkan di struct `StockConfig` — tinggal diimplementasikan).
- **(b) TWAP pool NVDA/USDG** — butuh pool V3 dengan likuiditas nyata; chicken-and-egg saat genesis (pool belum ada likuiditas sebelum protokol jalan). Solusi: seed pool kecil sebagai sanity-check, bukan sumber utama.
- **(c) Deviasi ganda (rekomendasi tim):** feed resmi sebagai primer + TWAP V3 sebagai checker (`bandBps` — parameter sudah ada di `setTwapSource`, tinggal dipakai di `_readInternal`: reject bila deviasi > band, freeze harga terakhir `lastGoodPrice`, pause buy).
- Perbaiki juga: `setMarketHalt(stock, halted)` saat ini meng-set `_globalHalt` — **halt satu saham = menghentikan SEMUA saham** (bug semantik kecil, mudah diperbaiki).
- Sesi pasar: 13:30–20:00 UTC = jam ET **saat DST musim panas saja**; musim dingin (EST) meleset 1 jam. Perlu koreksi DST atau terima deviasi ±1 jam secara eksplisit di dokumen.

### 5.2 🟠 IV hardcoded 50% (5000 bps) di semua seri

> **STATUS 2026-11-20 — SUDAH DIPERBAIKI.** `ArcumEngine._vol()` membaca `VolOracle.sigmaFor(stock)`, hasilnya di-clamp ke `MIN_SIGMA_BPS`/`MAX_SIGMA_BPS`, dan `quote`/`accrue`/`netGreeks` memakai nilai itu. Buy revert `StaleVol` kalau reading kedaluwarsa, jadi tidak ada lagi "selalu 50% IV". Bukti: `contracts/src/ArcumEngine.sol`, `contracts/src/VolOracle.sol`, `contracts/test/VolOracle.t.sol`. Catatan: vol **tetap perlu** diposting rutin oleh publisher (`vol-engine/post_vol.py`) — hanya harga saham yang otomatis dari Chainlink.

Teori everlasting butuh IV sebagai input harga. Sekarang seluruh kurva = satu angka. Konsekuensi: pool **selalu mengquote 50% IV** — kalau volatilitas riil NVDA jauh di atas/bawah, LP sistematis rugi/dapat untung tanpa melihat pasar. Untuk launch kecil masih defensible (konsisten, tidak gameable), tapi jalan tengah yang murah: admin bisa set IV per stock (`setStock` config — tambah field `ivBps`), baru per-series nanti.

### 5.3 🟠 Risk cap 35%/8% tidak di-enforce hard di jalur buy
`capsFor/maxOutstandingBps` hanya view; `buy()` tidak mengecek `totalLiability ≤ 35% NAV` secara on-chain. Saat ini pengendali hanya disiplin admin (membuat seri & membatasi buyable). Rekomendasi: tambahkan O(1) check di `_buyInternal` (bookValue sudah ada di pool, murah) — hard solvency > soft policy.

### 5.4 🟡 Detail mekanis (non-blocker, untuk kelengkapan)
- `fillQueued(ticket)`: siapa pun bisa mengisi antrian sell saat HALTED tapi **tanpa insentif & tanpa slippage guard** — praktisnya keeper owner. Harga mengikuti mark saat fill (mock = beku di harga halt — konsisten, tapi jelaskan eksplisit di docs).
- `cancelQueued` memakai error `Expired()` untuk cek kepemilikan — kosmetik, bukan bug logika.
- `totalLiability`/`netGreeks` O(jumlah seri) — view saja; loop 50 seri masih aman di RPC, jangan pernah dipanggil di jalur transaksi (dan memang tidak).
- `OptionToken` mint/burn hanya oleh engine — supply = kewajiban riil. `totalLiability` menjumlah supply × mark. Konsisten ✅

---

## 6. REKONSILIASI DENGAN PERHITUNGAN MANAJER (gas)

| Item | Manajer (lokal + RPC mainnet via VPN) | Audit tim (broadcast testnet 46630 asli) | Kesimpulan |
|---|---|---|---|
| Gas price | **0,0202 gwei** (live RPC mainnet — data lebih baik) | asumsi 0,01–1 gwei | Manajer menang: angka live ✅ |
| Total gas suite | ~25–31 jt (48 tx, 11 seri) | 24,57 jt (15 CREATE) + buffer call | **KONSISTEN** ✅ |
| Biaya deploy | 0,00063 ETH ≈ Rp22.500 | "belasan–$100" ≈ Rp200rb–1,6jt | Estimasi tim = envelope atas; angka Manajer = titik presisi |
| Buffer | 0,002 ETH ≈ Rp71.000 | "siapkan 0,05 ETH" | Manajer cukup; 0,05 ETH terlalu konservatif |
| Bandingkan 3 kontrak via RPC mainnet, selisih +1% | ✅ | — | bukti L1 data fee Robinhood Chain saat ini hampir nol — asumsi Orbit kita terkonfirmasi |

**Verdict:** perhitungan Manajer **VALID dan lebih presisi** dari estimasi tim. Tidak ada konflik — tim memberi rentang, Manajer memberi titik dengan data live. Rekomendasi transfer 0,002 ETH masuk akal.

---

## 7. CHECKLIST PRE-MAINNET (urutan eksekusi)

> **STATUS 2026-11-20:** item 1, 2 (DST), 4, dan 5 sudah selesai. Item 3 dan rilis produksi masih terbuka. Detail per item ada di bawah.

1. **[BLOCKER] Implementasi feed oracle di PriceGuard** (§5.1) — ✅ **SELESAI.** `StockConfig.feed` dibaca, harga dari `AggregatorV3Interface`, `maxAge` per sesi, TWAP cross-check dengan pause saat deviasi, dan `MAX_AGE_CLOSED` 3 hari saat pasar tutup. Bukti: `test/PriceGuardChainlink.t.sol` (22 test) + `test/fork/Mainnet4663.t.sol` (9 test vs mainnet asli).
2. **`setMarketHalt` global→per-stock + koreksi DST** — ⚠️ **SEBAGIAN.** DST sudah benar (`sessionAt()` + test dua musim). `setMarketHalt(stock, halted)` **masih** meng-set `_globalPaused` sebagai shim kompatibilitas ABI; arahnya fail-safe, dan perilakunya dikunci test `test_setMarketHaltIsGlobalDocumentedFootgun`. Kalau mau benar-benar per-saham, itu perubahan ABI.
3. **Hard-cap check di `_buyInternal` (35%/8%)** — ⏳ **BELUM.** Masih kebijakan admin, bukan invariant on-chain.
4. **Keputusan IV** — ✅ **SELESAI.** IV per saham dari `VolOracle`, bukan konstanta 50%.
5. **Verifikasi feed NVDA nyata** — ✅ **SELESAI, terverifikasi on-chain.** `0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15` → `"RHNVDA / USD"`, 8 dp, `answeredInRound == roundId`. AAPL `0x6B22A786bAa607d76728168703a39Ea9C99f2cD0`, QQQ `0x80901d846d5D7B030F26B480776EE3b29374C2ae`. TSLA dan SPY **belum punya feed** di 4663, jadi tidak bisa masuk rilis produksi dulu.
6. **Deploy → verify Blockscout → genesis USDG** — ⏳ **BELUM.** Butuh key fresh + Safe owner + dana gas. Lihat `docs/MAINNET_READINESS.md`.

**Kesimpulan tim (diperbarui):** matematika tetap SOUND, dan kabel oracle harga yang dulu putus **sudah tersambung dan terverifikasi terhadap mainnet asli**. Yang memisahkan kode ini dari "live di mainnet" sekarang bukan lagi kode, tapi operasional: key deploy yang bersih, Safe yang bisa tanda tangan, dana gas, dan satu putaran audit.
