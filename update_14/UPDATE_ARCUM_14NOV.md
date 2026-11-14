# Arcum: Update Revisi 14 Nov 2026

> **Untuk:** dev Arcum
> **Dasar:** commit `841c6bb` (13 Nov 23:51), web live `arcumpool.xyz`, testnet 46630
> **Acuan:** `ARCUM_ROBINHOOD_DEV_BRIEF.md` (§4, §20, §24) dan `audit-arcum.md`
> **Progres saat ini:** ±55–60%
> **Kode perbaikan (before → after, contoh kode baru):** `KODE_PERBAIKAN_ARCUM_14NOV.md`

---

## 0. Hasil pengecekan commit `841c6bb`

### ✅ Diterima
| Item | Bukti |
|---|---|
| Series ID Buy (#1) | `computeSeriesId` sama dengan `registry.idOf` on-chain (NVDA UP 138, 141 dan 150 dicek) |
| Faucet guard chain (#9) | `TestnetFaucetModal.tsx` menolak chain selain 46630 |
| `initialChain` testnet (#10) | `Web3Provider.tsx` |
| Kontrak | `forge test` 37/37 lulus, typecheck web bersih, kode terbaru sudah live |

### ⚠️ Catatan untuk laporan sebelumnya
Tiga tx bukti (Buy `0xa810…8668`, Sell `0xc410…1a55`, Shield `0x5ecc…c5b0`) memang **sukses**, tapi dikirim **lewat script, bukan lewat tombol web**:
- `deadline` di ketiga tx sama persis, `1893456000` (tahun 2030). UI memakai `now + 3600`.
- Shield `maxCost` di tx = 50 USDG. UI mengirim 500 USDG.

Ini membuktikan kontrak bekerja, **tapi belum membuktikan UI bekerja**. Bukti selanjutnya wajib dari web (lihat §4).

---

## 0B. Penjelasan 16 item audit: tampilan, tujuan, dan akibatnya

Setiap item dijelaskan dengan format yang sama:
- **Tampilan yang diharapkan:** apa yang user lihat kalau item ini benar.
- **Tujuan / kenapa harus ada:** alasan dari brief atau dari sisi user.
- **Kondisi sekarang:** apa yang ada di kode.
- **Akibat kalau dibiarkan:** apa yang rusak atau menyesatkan.

| Status | Arti |
|---|---|
| ✅ | Selesai, tidak perlu disentuh |
| 🟡 | Sudah dibuat, tapi belum maksimal |
| ❌ | Belum ada |

---

### #1 ✅🟡 Series ID untuk Buy
- **Tampilan yang diharapkan:** di Trade, user memilih aset, Up/Down, Daily/Weekly dan strike. Yang muncul di daftar strike **hanya** strike yang benar-benar dilist di kontrak. Kalau tidak ada, tertulis "No listed series" dan tombol Buy mati.
- **Tujuan:** setiap option di kontrak punya ID unik (seriesId). Kalau ID yang dikirim UI salah, kontrak menolak (`SeriesUnknown`) dan user kehilangan gas.
- **Kondisi sekarang:** rumus ID sudah benar (cocok dengan on-chain untuk NVDA). Tapi daftar strike ditulis tangan di `series.ts`, aset lain jatuh ke grid NVDA 138–150, dan epoch dipatok 0.
- **Akibat kalau dibiarkan:**
  - User memilih TSLA UP $141 → strike itu tidak ada di kontrak → tx revert, gas hilang.
  - Setelah admin melakukan relist (epoch naik), **semua** Buy dari UI revert lagi seperti bug lama.
  - Setiap kali admin menambah strike baru, dev harus edit kode dan deploy ulang web.

### #2 ❌ Web membaca chain
- **Tampilan yang diharapkan:** harga saham, mark price option, total settlement, NAV pool, saldo user, semuanya angka asli dari kontrak dan ikut berubah saat kondisi on-chain berubah. Kalau RPC mati, angka berubah jadi `—`.
- **Tujuan:** brief §4 dan §7: produk ini adalah aplikasi on-chain. Angka yang dilihat user harus sama dengan angka yang dipakai kontrak saat transaksi.
- **Kondisi sekarang:** hook `usePrice`, `useOnChainQuote`, `useOnChainPool`, `useSeriesList`, `useOnChainAgentPolicy` sudah dibuat, tapi **tidak di-import di halaman mana pun**. Harga NVDA selalu $142,50, quote dihitung di browser.
- **Akibat kalau dibiarkan:**
  - Order Summary bilang "Total $47,63", padahal kontrak menagih angka lain. Kalau beda > 5%, tx revert (`maxCost` terlewati); kalau lebih murah, user tetap melihat angka yang salah.
  - Harga tidak pernah bergerak, sehingga terlihat seperti demo, bukan produk.
  - Semua item lain (#3–#7) ikut tidak bisa dibuktikan, karena datanya tidak dari chain.

### #3 🟡 Sell / Close posisi
- **Tampilan yang diharapkan:** di Positions, setiap option yang user pegang muncul dengan jumlah token, effective units (setelah decay), nilai saat ini, dan tombol **Close**. Klik Close → popup wallet → tx sukses → baris hilang, saldo USDG naik, link Blockscout muncul.
- **Tujuan:** brief §3: "Closing means selling the remaining effective position at the executable bid." Tanpa Sell, user hanya bisa beli dan tidak bisa keluar.
- **Kondisi sekarang:** tombol Close sudah mengirim tx `sell`. Tapi daftar posisinya dibuat sendiri oleh UI setelah Buy, bukan dibaca dari saldo token di chain. Toast sukses muncul begitu hash keluar, sebelum tx terkonfirmasi.
- **Akibat kalau dibiarkan:**
  - User Buy, lalu refresh → tab Positions kosong. Token ada di wallet, tapi **tidak ada cara Sell dari UI**. Bagi user, ini terlihat seperti uangnya hilang.
  - Jumlah yang dijual memakai angka lokal, bukan saldo asli → bisa revert atau menyisakan debu token.
  - Toast "Position Closed" muncul walau tx akhirnya gagal.

### #4 🟡 Shield
- **Tampilan yang diharapkan:** user memasukkan jumlah saham yang ingin dilindungi (misal 10 NVDA) dan tingkat perlindungan (misal 5% di bawah harga). UI menampilkan put Weekly yang dilist yang dipilih kontrak, biaya, dan saldo stock token user. Kalau jumlahnya melebihi saldo, tombol mati dengan pesan jelas.
- **Tujuan:** brief §3: Shield memeriksa kepemilikan Stock Token, lalu memilih put Weekly yang **dilist** sesuai persentase yang diminta. Tidak boleh mengarang strike atau menjanjikan perlindungan permanen.
- **Kondisi sekarang:** tombol mengirim tx, tapi parameternya selalu 10 token, 5%, maxCost 500 USDG, approve 500 USDG. Teks di layar menghitung strike sendiri (harga × 0,95), "95.0% Portfolio Value", "~0.71%", dan menyebut "Automated".
- **Akibat kalau dibiarkan:**
  - User yang punya 3 NVDA tidak bisa Shield sama sekali (kontrak menolak karena 10 > 3).
  - User yang ingin perlindungan 10% tetap mendapat 5%.
  - Approve 500 USDG padahal biayanya cuma beberapa dolar → melanggar aturan exact approval.
  - Strike yang tampil bukan strike yang benar-benar dibeli. "Automated" adalah klaim yang tidak ada.

### #5 🟡 Writer Pool: deposit, withdraw, claim
- **Tampilan yang diharapkan:** tab Pool menampilkan NAV, NAV/share, utilisasi, saldo share user, kapan lock selesai. Ada tombol **Deposit**, **Request Withdraw**, dan daftar tiket penarikan dengan status (menunggu / bisa diklaim / kedaluwarsa) serta tombol **Claim**.
- **Tujuan:** brief §3 dan §4: pool adalah lawan transaksi setiap option. Deposit, lock, antrean penarikan, klaim, partial payout dan requeue adalah "core product behavior".
- **Kondisi sekarang:**
  - Deposit mengirim tx (approve tepat + deposit). ✅
  - Request withdraw mengirim jumlah share tanpa desimal: share punya 18 desimal, jadi input "5" terkirim sebagai 0,000000000000000005 share.
  - Tombol Claim **tidak ada**. Daftar tiket tidak ada.
- **Akibat kalau dibiarkan:**
  - Writer deposit uang, lalu **tidak bisa menariknya kembali dari UI**: request-nya salah jumlah, dan klaimnya tidak ada tombol.
  - Ini risiko paling serius untuk kepercayaan: uang masuk mudah, keluar tidak bisa.
  - Tiket yang lewat 7 hari otomatis dijadwalkan ulang di kontrak; tanpa status di UI, user mengira klaimnya gagal.

### #6 ❌ Agent policy dan revoke
- **Tampilan yang diharapkan:** tab Agents menampilkan alamat agent yang diizinkan, budget, terpakai, batas per transaksi, aset yang diizinkan, masa berlaku, dan tombol **Revoke** yang benar-benar mencabut izin di kontrak.
- **Tujuan:** brief §16 dan §24 no. 9: agent AI hanya boleh bertindak dalam batas policy, dan user harus bisa mencabutnya kapan saja. Ini fitur keamanan.
- **Kondisi sekarang:** tombol Revoke hanya mengubah tampilan dan menampilkan toast "AgentRouter.sol has revoked autonomous trading authority on-chain". Tidak ada tx. Alamat agent yang tampil sebenarnya alamat router.
- **Akibat kalau dibiarkan:**
  - User mengira agent sudah dicabut, padahal **agent masih bisa trading dengan uangnya**. Ini klaim keamanan palsu, paling berbahaya dari semua item.
  - Data policy yang tampil bukan policy asli.

### #7 ❌ Activity
- **Tampilan yang diharapkan:** daftar riwayat transaksi user (Buy, Sell, Shield, Deposit, Request, Claim, Revoke) dengan waktu, jumlah, dan link Blockscout. Tetap ada setelah refresh dan di perangkat lain.
- **Tujuan:** brief §17: receipts dan indexing. User butuh bukti apa yang sudah dilakukan dan berapa yang dibayar.
- **Kondisi sekarang:** di Live Mode tab ini kosong. Tidak ada pembacaan event dari chain.
- **Akibat kalau dibiarkan:** user tidak punya riwayat. Setelah refresh, tidak ada jejak transaksi di aplikasi, dan user harus mencari sendiri di Blockscout.

### #8 ❌ Hardcode tersisa
- **Tampilan yang diharapkan:** tidak ada angka yang ditulis tangan di Live Mode. `change24h` hilang (atau dari sumber nyata), tidak ada tombol untuk paket yang belum ada.
- **Tujuan:** angka yang terlihat seperti data asli tapi sebenarnya karangan akan menyesatkan user dan juri.
- **Kondisi sekarang:**
  - `change24h` NVDA +3,42%, TSLA −1,15%, dst. Angkanya tidak pernah berubah.
  - Tombol copy `npx -y @arcum/mcp`: paketnya tidak ada di npm (404).
  - `INITIAL_POOL_STATS`: NAV dan kapasitas pool ditulis tangan.
- **Akibat kalau dibiarkan:**
  - Siapa pun yang membuka web dua hari berturut-turut melihat persentase yang sama, jadi langsung ketahuan palsu.
  - Developer yang menyalin perintah MCP mendapat error.
  - Pool terlihat punya likuiditas yang tidak ada. Brief §4 secara khusus melarang ini: "Do not promise meaningful trade size with an empty/tiny pool."

### #9 ✅ Guard chain di faucet
- **Tujuan:** mencegah wallet yang tersambung ke mainnet mengirim `mint` ke alamat yang tidak ada di mainnet.
- Sudah selesai. Tidak perlu disentuh.

### #10 ✅ `initialChain` testnet
- **Tujuan:** saat user connect pertama kali, wallet langsung diminta ke testnet 46630, bukan mainnet.
- Sudah selesai. Tidak perlu disentuh.

### #11 ❌ `shieldFor` lewat agent
- **Tampilan yang diharapkan:** agent yang diberi izin bisa membeli Shield atas nama user, dan hasilnya sama dengan Shield langsung.
- **Tujuan:** brief §4 parity matrix: Shield harus dibuktikan lewat dua jalur, "direct-wallet **and** delegated-agent journeys".
- **Kondisi sekarang:** `AgentRouter._pickShield` memakai logika pemilihan strike yang berbeda dari engine, sehingga selalu revert `SeriesNotBuyable(0)`.
- **Akibat kalau dibiarkan:** satu dari dua jalur Shield yang diwajibkan brief tidak berfungsi. Agent yang mencoba Shield selalu gagal dan membuang gas.

### #12 ❌ Fork test
- **Tampilan yang diharapkan:** (bukan tampilan, ini tes) satu file tes yang terhubung ke testnet 46630 asli, membaca alamat dari `deployments/46630.json`, lalu menjalankan buy, sell, shield, shieldFor, deposit, request, claim terhadap kontrak yang benar-benar dideploy.
- **Tujuan:** tes lokal menguji kontrak yang baru dideploy di memori. Fork test menguji **kontrak yang dipakai user**, dengan konfigurasi dan saldo aslinya.
- **Kondisi sekarang:** file bernama "Testnet46630" tapi deploy ulang secara lokal. `shieldFor` tidak dites.
- **Akibat kalau dibiarkan:** bug seperti #11 lolos walau "semua tes hijau". 37/37 lulus tidak membuktikan deployment testnet benar.

### #13 ❌ 5 library di manifest
- **Tampilan yang diharapkan:** `deployments/46630.json` dan halaman Contracts mencantumkan semua kontrak yang dideploy, termasuk library Greeks, Math, Funding, PoolHedging, PoolLayers, semuanya verified di Blockscout.
- **Tujuan:** brief §8 dan §20: semua alamat harus tercatat supaya bisa diaudit, diverifikasi, dan dipakai di halaman Exit.
- **Kondisi sekarang:** 0 dari 5 library tercatat. PoolLayers belum verified.
- **Akibat kalau dibiarkan:** auditor atau user tidak bisa memverifikasi kode yang sebenarnya dijalankan. Untuk mainnet, ini wajib.

### #14 ❌ Keeper, indexer, quickstart
- **Tampilan yang diharapkan:** keeper berjalan berkala dan meninggalkan tx `accrueMany` di Blockscout. Script quickstart agent mencetak tx hash asli yang bisa dibuka di Blockscout.
- **Tujuan:** brief §17 dan milestone C: holding cost (decay) harus benar-benar dicatat on-chain secara berkala; service yang diklaim harus nyata.
- **Kondisi sekarang:**
  - Keeper menghitung decay di memori, tidak pernah mengirim tx.
  - Indexer menyimpan event di array memori (hilang saat restart).
  - `agent_quickstart.ts` mencetak tx `0x8f4c…` yang merupakan teks tetap di kode.
  - MCP masih menunjuk pool Lemniscate (proyek referensi), bukan pool Arcum.
- **Akibat kalau dibiarkan:**
  - Norm on-chain tidak diperbarui, sehingga nilai posisi yang dilihat user basi.
  - Developer yang mencoba quickstart melihat "sukses" palsu.
  - Agent lewat MCP berinteraksi dengan **kontrak proyek lain**.

### #15 ❌ Rute yang belum ada
- **Tampilan yang diharapkan:** halaman `/protocol`, `/writers`, `/costs`, `/markets/*`, `/learn/*`, `/privacy`, `/product-terms` bisa dibuka langsung dari link.
- **Tujuan:** brief §7: paritas halaman dengan referensi. Privacy dan product terms juga dibutuhkan sebelum produk dipakai publik.
- **Kondisi sekarang:** hanya rute utama dan tab dashboard.
- **Akibat kalau dibiarkan:** link dari Docs atau luar menuju 404. Tidak ada halaman legal.

### #16 ❌ Bukti E2E dari UI
- **Tampilan yang diharapkan:** file `docs/TESTNET_E2E_EVIDENCE.md` berisi skenario E1–E10 (§4), masing-masing dengan tx hash, link Blockscout, dan rekaman layar dari `arcumpool.xyz`.
- **Tujuan:** brief §24: "Final demonstrations must use our deployments and services." Ini satu-satunya cara membuktikan produk bekerja dari sisi user.
- **Kondisi sekarang:** belum ada. Tx bukti yang dikirim dev adalah tx dari script (lihat §0).
- **Akibat kalau dibiarkan:** tidak ada yang bisa menyatakan "sudah jalan di testnet". Semua klaim selesai tidak bisa diterima.

---

### Takeout yang masih tersisa

| # | Yang tampil sekarang | Tujuan diganti | Akibat kalau dibiarkan |
|---|---|---|---|
| H10 | "Writer Pool Risk Cap: **35.0% NAV**" di Order Summary | Batas risiko pool menentukan berapa banyak option yang bisa dibeli. Harus dibaca dari `maxOutstandingBps()` | Kalau admin mengubah batas di kontrak, UI tetap bilang 35%. User membeli melebihi kapasitas, lalu tx revert |
| H12 | Shield: strike = harga × 0,95, "95.0% Portfolio Value", "~0.71% of Portfolio" | Brief §3: strike harus dari series yang dilist, dan Shield "does not lock a guaranteed portfolio floor" | User melihat strike dan biaya yang bukan yang dibeli. "95% Portfolio Value" terbaca seperti jaminan, padahal bukan |
| H21 | "**1-Click Automated** Shield Protection" (Dashboard, Products) | Shield adalah pembelian manual satu kali | User mengira perlindungannya diperbarui otomatis, padahal option-nya terus decay dan tidak diperpanjang |

---

## 1. Prioritas 1: sambungkan UI ke chain (blocker)

### 1.1 Pakai hook baca yang sudah dibuat
**Before:** `web/src/hooks/chain/` berisi `usePrice`, `useOnChainQuote`, `useOnChainPool`, `useSeriesList` dan `useOnChainAgentPolicy`, tapi **tidak di-import di halaman mana pun**. Harga, quote dan NAV masih dari `INITIAL_STOCKS`, `INITIAL_POOL_STATS` dan perhitungan di browser.

**Langkah:**
- Harga di ticker dan Trade: `usePrice(stock.address)`. Hapus harga tetap di `INITIAL_STOCKS`.
- Order Summary (mark price, total settlement): `useOnChainQuote(seriesId, unitsWad, true)`. Hapus `currentQuote` hasil hitung di browser.
- Tab Pool: `useOnChainPool(address)` untuk NAV, NAV/share, total supply, saldo share dan `unlockTime`.
- Tab Agents: `useOnChainAgentPolicy(owner, agent)`.

**After:** semua angka di Live Mode berasal dari chain. Kalau RPC gagal, tampilkan `—`, jangan angka cadangan.

**Cek:** matikan internet atau ganti RPC ke URL salah. Semua angka berubah menjadi `—`, tidak ada angka "mirip asli".

### 1.2 Positions dibaca dari chain
**Before:** posisi dibuat sendiri oleh UI setelah Buy (`setPositions`). Kalau halaman di-refresh, posisi hilang, dan Sell tidak bisa dilakukan padahal token ada di wallet.

**Langkah:**
- Ambil daftar series yang dilist (event `SeriesListed` dari registry, atau `seriesCount` + iterasi).
- Untuk setiap series, baca saldo token option milik user dan `effectiveUnits` (norm).
- Tampilkan baris hanya untuk saldo > 0. Sell memakai saldo on-chain, bukan `pos.rawTokens` lokal.
- **Holding cost:** saat ini posisi baru diisi `norm: 1.0` dan `effectiveUnits: tradeUnits` (`DashboardPage.tsx:237-238`), jadi decay tidak pernah terlihat. Ambil norm series dari engine dan hitung effective units = saldo × norm. Nilai posisi = quote bid untuk effective units (brief §4 "Holding cost").

**After:** Buy, refresh, posisi tetap ada. Buka di browser lain dengan wallet yang sama, posisi juga ada.

### 1.3 Strike dari registry, bukan daftar tetap
**Before:** `web/src/utils/series.ts` `getListedStrikes` berisi angka tetap, dan fallback-nya grid NVDA 138–150 untuk semua aset. TSLA UP 141 tidak dilist, jadi tx akan revert. `epoch` dipatok `0`, sehingga seriesId salah setelah relist.

**Langkah:**
- Daftar strike = series yang dilist untuk `(stock, isCall, tau)` dan `buyable == true`.
- seriesId diambil dari `registry.idOf(stock, isCall, strike, tau)` (sudah memperhitungkan epoch), bukan dihitung manual dengan epoch 0.
- Kalau tidak ada series untuk kombinasi itu, tampilkan "No listed series" dan matikan tombol Buy.

**After:** tidak ada pilihan strike yang pasti revert.

---

## 2. Prioritas 2: perbaiki aksi yang sudah mengirim tx

### 2.1 Pool withdraw: unit salah
**Before:** `DashboardPage.tsx` `handleRequestWithdraw`: `BigInt(Math.round(withdrawShares))`. Share WriterPool punya 18 desimal (USDG 6 + offset 12). Input 5 share terkirim sebagai 5 wei share.

**Langkah:** `parseUnits(String(withdrawShares), 18)`. Validasi terhadap saldo share dan `unlockTime` sebelum kirim.

### 2.2 Pool claim dan requeue belum ada
**Brief §4 dan §24 no. 5:** request, claim, requeue dan partial payout adalah perilaku inti.

**Langkah:**
- Baca tiket user (event `WithdrawalQueued`), lalu tampilkan status: menunggu notice, bisa diklaim, kedaluwarsa.
- Tombol **Claim** memanggil `WriterPool.claim(ticket)`.
- Tampilkan partial payout kalau kas pool tidak cukup.
- **Requeue sudah ada di kontrak, otomatis di dalam `claim`** (`WriterPool.sol` sekitar baris 305–308). Kalau tiket diklaim setelah `claimableAt + CLAIM_WINDOW`, tiket tidak dibayar tapi dijadwalkan ulang dan event `WithdrawalQueued` dipancarkan lagi dengan `claimableAt` baru. UI wajib:
  - membaca `claimableAt` terbaru dari event `WithdrawalQueued` **terakhir** per tiket (bukan yang pertama);
  - menampilkan status "Expired, will requeue on claim" kalau sudah lewat jendela klaim, supaya user tidak kaget dananya tidak keluar;
  - menampilkan sisa tiket setelah partial payout (klaim pro-rata harian, sisa tetap bisa diklaim).

### 2.3 Shield memakai input user
**Before:** `handleExecuteShield` selalu mengirim 10 token, 5% dan maxCost 500 USDG, lalu approve 500 USDG. Teks Shield masih "Strike × 0.95", "95.0% Portfolio Value", "~0.71% of Portfolio" dan "Automated".

**Langkah:**
- `tokenUnits` = input user, dibatasi oleh saldo stock token user (baca `balanceOf`).
- `pctBps` = input user.
- Strike yang ditampilkan = put Weekly yang **dilist** dan dipilih kontrak (brief §3: jangan mengarang strike).
- `maxCost` = quote × 1,05. Approve **tepat** sebesar itu.
- Hapus "Automated" di Dashboard (`:1026`, `:1029`) dan Products (`:103`).

### 2.4 Agent revoke harus tx
**Before:** `handleToggleAgentRevoke` hanya `setAgentPolicy` dan menampilkan toast "AgentRouter.sol has revoked…". Tidak ada tx.

**Langkah:** panggil `AgentRouter.revoke` / `setPolicy` lewat `writeContractAsync`, tunggu receipt, lalu refetch `useOnChainAgentPolicy`. Tampilkan toast setelah receipt. `INITIAL_AGENT_POLICY.agentAddress` (`protocol.ts:117`) masih alamat router, jadi ganti dengan input alamat agent dari user.

### 2.5 Toast setelah receipt
Semua aksi (Buy, Sell, Shield, Deposit, Withdraw, Claim, Revoke) menampilkan "sukses" **setelah** `waitForTransactionReceipt` dengan `status === 'success'`, lengkap dengan link Blockscout. Saat ini toast muncul begitu hash keluar.

---

## 3. Prioritas 3: sisa audit

| # | Item | Lokasi | Langkah |
|---|---|---|---|
| A | Activity kosong | Tab Activity | Baca event engine dan pool (`getContractEvents`) untuk wallet user, dengan link tx |
| B | Hardcode tersisa | `protocol.ts:57-93` `change24h`; `DashboardPage.tsx:864` "Risk Cap 35.0%"; `:1194` `npx -y @arcum/mcp` | `change24h` dihapus. Risk cap dari `maxOutstandingBps()`. Tombol MCP dihapus sampai paketnya terbit |
| C | `shieldFor` agent revert | `contracts/src/AgentRouter.sol:168, 274` `_pickShield` | Pakai logika pemilihan yang sama dengan engine (atau panggil fungsi engine). Tambahkan tes |
| D | Fork test bukan fork | `contracts/test/` | Tes baru dengan `vm.createSelectFork` ke 46630, membaca `deployments/46630.json`, menjalankan buy, sell, shield, shieldFor, deposit, request, claim |
| E | Library tidak ada di manifest | `deployments/46630.json` | Tambahkan Greeks, Math, Funding, PoolHedging, PoolLayers beserta alamatnya. Verifikasi PoolLayers di Blockscout |
| F | Keeper simulasi | `app/src/keeper/keeper.ts:52` | Panggil `engine.accrueMany(ids)` on-chain dengan key keeper khusus, log tx hash |
| G | Indexer di memori | `app/src/indexer/indexer.ts:74` | `getLogs` dengan checkpoint blok, atau hapus dan biarkan web membaca log langsung (poin A) |
| H | Tx palsu | `scripts/agent_quickstart.ts:99` `0x8f4c…` | Ganti dengan panggilan nyata, atau hapus script |
| I | Alamat Lemniscate di MCP | `app/src/mcp/tools.ts` `0x67fF…B58A` | Ambil dari manifest 46630 |
| J | Rute belum ada | `web/src/App.tsx` | `/protocol`, `/writers`, `/costs`, `/markets/*`, `/learn/*`, `/privacy`, `/product-terms` (brief §7) |
| L | **Klaim Timelock palsu** | `protocol.ts:28, 42` timelock = `0x000…000` (tidak dideploy), tapi `ContractsPage.tsx:68` dan `DocsPage.tsx:74` menulis "48-hour timelock" | Hapus klaim, atau deploy Timelock dan pindahkan ownership. Selama belum, tulis "Owner: EOA (testnet), timelock belum aktif" |
| M | Teks parameter salah | `DocsPage.tsx:53` "24-hour deposit lock", Pool "72-hour notice". Kontrak: lock dan queue delay dikonfigurasi (min 1 menit / 5 menit), `CLAIM_WINDOW` 7 hari | Ambil nilai dari kontrak (`lockSeconds`, `queueDelay`), jangan ditulis tangan |
| N | Fitur tidak aktif ditulis aktif | `DocsPage.tsx:59, 183` "Uniswap V3 TWAP Anti-Sandwich"; `:66` "ERC-4337"; `ContractsPage.tsx:255` | Pindahkan ke bagian **Disabled / later phase** sesuai §5 |
| O | API server angka tetap | `app/src/api/server.ts:41` `lastBlock: 18942109`; `:110-130` NAV 2.500.000, APR 18,4%, harga 142,50 | API membaca kontrak, atau endpoint dihapus. Web jangan memakai API ini |
| P | Laporan "sukses" tanpa dasar | `HANDOVER_PACKAGE.md:13, 30-31` menulis "VERIFIED" dan chain `4663`, buktinya hanya unit test; `scripts/mainnet_dry_run.py`, `canary_mainnet_fork.py`, `deployments/*_report.json` | Hapus, atau beri header "SIMULASI, bukan bukti". Handover diperbarui setelah E1–E10 dengan tx hash dari UI |
| Q | RPC mainnet di config | `config/wagmi.ts:14,17`, `protocol.ts:6` `rpc.mainnet.chain.robinhood.com` | Biarkan hanya untuk definisi chain mainnet yang dikunci. Pastikan semua read/write memakai transport testnet |
| R | Alamat demo | `App.tsx:52` `0x71C8...Demo` | Boleh, asal hanya di Demo Mode dengan badge "DEMO" yang jelas |
| K | Exit | `ExitPage.tsx` | Alamat sudah dari manifest (✅). Lengkapi langkah tanpa app: sell, `cancelQueued`, request, claim (termasuk requeue otomatis) dan cara cabut approval (brief §20) |

---

## 4. Bukti yang diminta (Definition of Done)

Bukti **wajib dari web** `arcumpool.xyz`, dengan wallet baru (bukan wallet deployer `0x1B4F…3e45`). Simpan di `docs/TESTNET_E2E_EVIDENCE.md`: tx hash, link Blockscout, dan rekaman layar.

| # | Skenario (brief §24) | Bukti |
|---|---|---|
| E1 | Connect → claim faucet → Buy NVDA Up dari UI | 2 tx (approve tepat, buy) |
| E2 | Refresh halaman Positions → posisi tetap muncul dengan effective units | Rekaman |
| E3 | Sell dari Positions | tx, saldo USDG naik |
| E4 | Pilih aset/strike yang tidak dilist → tombol Buy mati | Screenshot |
| E5 | Shield dengan input user (jumlah dan %) | 2 tx |
| E6 | Shield melebihi saldo stock token → ditolak dengan pesan jelas | Screenshot |
| E7 | Pool deposit → tunggu lock → request withdraw → claim | 3–4 tx |
| E8 | Agent: set policy → buyFor → revoke → buyFor ditolak | tx per langkah |
| E9 | Activity menampilkan semua tx di atas setelah refresh | Rekaman |
| E10 | Wallet di chain lain → semua tombol aksi terkunci | Screenshot |

**Cek takeout terakhir** (hasil harus kosong):
```bash
cd web/src
grep -rnE "change24h: [0-9-]|35\.0% NAV|@arcum/mcp|0\.95\)|95\.0% Portfolio|0\.71%|Automated|0x8f4c|48-hour|24-hour|72-hour|Anti-Sandwich|ERC-4337|18942109|2500000" . ../../app ../../scripts | grep -v demoFixtures
```

---

## 5. Aturan supaya tidak revisi berulang

Item dianggap **selesai** hanya kalau memenuhi semua ini. Kalau tidak, item dikembalikan tanpa dibahas ulang.

1. **Tx bukti dari UI, bukan script.** Tx dikirim dari wallet baru lewat tombol di `arcumpool.xyz`. Tx dari `cast`, Foundry script, atau wallet deployer `0x1B4F…3e45` tidak dihitung. Parameter tx akan dicek (deadline harus ±1 jam dari waktu blok, bukan angka tetap).
2. **Hook dibuat = hook dipakai.** File baru tanpa import di halaman tidak dihitung selesai.
3. **Tidak ada angka cadangan di Live Mode.** Kalau data chain belum ada, tampilkan `—` atau state kosong. Angka contoh hanya boleh di `demoFixtures.ts`.
4. **Toast sukses hanya setelah receipt `success`.** Toast setelah hash keluar dianggap belum selesai.
5. **Refresh test.** Setiap layar yang menampilkan data user (Positions, Pool, Agents, Activity) harus tetap benar setelah refresh dan di browser lain.
6. **Laporan pakai nomor dokumen ini** (1.1, 2.3, E5, dst), bukan ringkasan bebas. Klaim "tuntas" tanpa nomor dan bukti tidak diproses.

### Di luar scope testnet (jangan dikerjakan dulu)
- x402 (sudah dikeluarkan dari scope).
- Hedger on-chain, vol engine live, FeeRouter/token buyback, reward vault, AA/paymaster: cukup ditandai **Disabled** di halaman capability status, jangan diklaim aktif.
- Mainnet 4663: tetap dikunci sampai semua E1–E10 lulus.

---

## 6. Urutan kerja yang disarankan

1. §1.1–1.3 (baca chain, positions, strike). Tanpa ini, aksi lain tidak bisa dibuktikan.
2. §2.1–2.5 (perbaiki aksi tx).
3. §3 A, B, C, D.
4. Rekam E1–E10 dan isi `docs/TESTNET_E2E_EVIDENCE.md`.
5. §3 E–R.

Laporan berikutnya cukup berisi: commit hash, item yang selesai (nomor dari dokumen ini), dan link tx **yang dikirim dari UI**.
