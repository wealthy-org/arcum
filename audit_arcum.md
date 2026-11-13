# Panduan Wajib: Pemisahan Kontrak Sendiri & Cara Deploy ke Robinhood Testnet (`46630`)

Dokumen ini dibuat agar kita punya satu pemahaman yang sama sebelum lanjut ke tahap testing wallet dan persiapan Mainnet.

---

## 1. Klarifikasi Penting: Address yang Sekarang Ada di Code Itu Bukan Kontrak Kita

Address yang saat ini terpasang di `web/src/config/wagmi.ts`, `web/src/data/protocol.ts`, `deployments/4663.json`, dan tampil di halaman `Docs` / `Contracts` (`Chain 4663`):

- `Engine`: `0x1C1f41721fe49c8dee117B17De1006817C974687`
- `WriterPool`: `0x67fF1306201bCbEBCBB749DcF0cb2686ec11B58A`
- `AgentRouter`: `0x0Dd88438A7d5Aa39141240BC846482cB3a74D0c9`
- `Reserve`: `0x2f719703bf5d569975c5cf32748b64d1926762b7`
- `FeeRouter`: `0x01dcf620ebd6b4db8cba7834bd0f2245855eea6e`
- `Timelock`: `0x58c276f4a75602fcf722b0119dc774466884a94e`

**Fakta penting yang wajib diluruskan:**
1. Semua address di atas adalah **kontrak LIVE milik proyek lain (Lemniscate — sumber referensi)**, bukan kontrak milik Arcum.
2. Source code yang diberikan di brief awal hanyalah **contoh/referensi cara kerja protokol**. Tugas tim adalah **meng-compile dan men-deploy kontrak milik Arcum sendiri** dari folder `contracts/`, baik untuk **Testnet (`46630`)** maupun nanti saat **Mainnet (`4663`)**.
3. **Kenapa berbahaya kalau masih pakai address di atas:**
   Saat tombol `Buy` ditekan di web sekarang, wallet user justru diminta menyetujui transaksi di **Robinhood Chain Mainnet (`4663` — memakai gas & USDG asli)** dan memberi izin tarik USDG (`approve`) kepada kontrak **pihak luar (`0x1C1f...4687`)**, bukan ke kontrak Arcum.

> **Aturan Baku:**
> - **Di Testnet (`46630`):** Kita deploy semua kontrak sendiri dari nol (termasuk `MockUSDG` supaya bebas di-mint untuk testing).
> - **Di Mainnet (`4663`) nanti:** Kita juga tetap **deploy sendiri** seluruh kontrak inti (`ArcumEngine`, `SeriesRegistry`, `WriterPool`, `PriceGuard`, `Reserve`, `FeeRouter`, `AgentRouter`, `Timelock`) memakai deployer/multisig Arcum. Yang kita sambungkan ke aset resmi jaringan Mainnet hanyalah alamat token **USDG canonical** dan **Stock Tokens** resmi di Robinhood Chain.

---

## 2. Kenapa Pengujian Explorer Testnet Sekarang Belum Valid

Berdasarkan pengecekan langsung ke kode dan RPC resmi Robinhood Testnet (`https://rpc.testnet.chain.robinhood.com`):

1. **Belum ada kontrak yang ter-deploy di Testnet `46630`:**
   - Saat dicek ke RPC Testnet (`eth_getCode`), seluruh alamat di `deployments/46630.json` masih kosong (`0x`).
   - Di `deployments/46630.json` baris `writerPool.implementation` bahkan tertulis `"0xG69F0Be7599e02DCf8B4494c6841845FC54994aC"` (huruf `G` bukan karakter hex), dan folder `contracts/broadcast/` belum ada. Ini tanda `Deploy.s.sol` memang belum pernah di-broadcast ke testnet.
2. **Ada Fallback Tx Hash Palsu di Frontend:**
   - Di `web/src/hooks/useOnChainTrade.ts` dan `web/src/components/TestnetFaucetModal.tsx`, ketika transaksi gagal/revert di blok `catch`, kode membuat Tx Hash acak pakai `Math.random()` lalu tetap menampilkan status **"Confirmed"** dan tombol **"View on Blockscout Explorer"**.
   - Akibatnya, di browser terlihat seolah berhasil padahal tidak ada transaksi yang masuk ke blockchain.
3. **URL Explorer Testnet Salah Tulis:**
   - Di `web/src/config/wagmi.ts`, URL explorer testnet ditulis `https://testnet.robinhoodchain.blockscout.com` (domain ini tidak bisa diakses / NXDOMAIN).
   - Explorer resmi Robinhood Chain Testnet adalah **`https://explorer.testnet.chain.robinhood.com`**.
4. **Format Parameter `buy()` di Frontend Belum Cocok dengan Kontrak:**
   - Frontend mengirim string teks seperti `"0xNVDA_UP_140_D"` lalu di-hash dengan `keccak256(stringToHex(...))`, serta mengirim `units` sebagai angka biasa (misal `10n`).
   - Kontrak asli (`SeriesRegistry.sol` & `ArcumEngine.sol`) membutuhkan `seriesId` hasil `idOf(stock, isCall, strikeWad, tauSeconds)` (`abi.encode(...)`) dan `units` dalam skala 18 desimal / WAD (`10 * 1e18`).

---

## 3. Cara Deploy ke Robinhood Testnet (`46630`) — Langkah demi Langkah

Ikuti urutan ini secara berurutan agar transaksi benar-benar tercatat on-chain dan bisa dibuka di Explorer Testnet.

### Langkah 1 — Siapkan Jaringan & Saldo Gas Testnet (`ETH`)
Tambahkan jaringan **Robinhood Chain Testnet** ke wallet deployer (pakai wallet khusus testing, jangan wallet mainnet utama):

- **Network Name:** `Robinhood Chain Testnet`
- **Chain ID:** `46630`
- **RPC URL:** `https://rpc.testnet.chain.robinhood.com`
- **Currency Symbol:** `ETH`
- **Block Explorer:** `https://explorer.testnet.chain.robinhood.com`

Pastikan wallet deployer sudah punya saldo ETH Testnet untuk bayar gas deploy (minta dari faucet ETH Robinhood Testnet jika masih kosong).

### Langkah 2 — Siapkan `.env` di Folder `contracts/`
Buat file `contracts/.env` (pastikan `.env` masuk `.gitignore` dan **jangan pernah di-commit ke GitHub**):

```env
PRIVATE_KEY=0xISI_PRIVATE_KEY_WALLET_TESTNET_KAMU
TESTNET_RPC_URL=https://rpc.testnet.chain.robinhood.com
```

### Langkah 3 — Cek Kesiapan Script `contracts/script/Deploy.s.sol`
Sebelum broadcast ke jaringan, pastikan:
1. Seluruh kombinasi seri (aset, Up/Down, strike, dan Daily/Weekly) yang mau dites di web sudah dipanggil lewat `registry.listSeries(...)` saat deploy atau via script setup.
2. Kontrak `WriterPool` dan `ArcumEngine` sudah terhubung/diberi izin yang benar sesuai alur buy & sell.
3. Jalankan simulasi compile & dry-run (tanpa `--broadcast`) dulu untuk memastikan tidak ada error:

```bash
cd contracts
forge build
forge script script/Deploy.s.sol:DeployArcum \
  --rpc-url https://rpc.testnet.chain.robinhood.com
```

### Langkah 4 — Broadcast Deploy Sungguhan ke Testnet `46630`
Jika simulasi di Langkah 3 sukses tanpa error, jalankan deploy asli dengan `--broadcast`:

```bash
cd contracts
source .env
forge script script/Deploy.s.sol:DeployArcum \
  --rpc-url $TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

Setelah selesai:
1. Catat seluruh alamat kontrak baru yang tercetak di terminal (`MockUSDG`, `PriceGuard`, `SeriesRegistry`, `WriterPool`, `ArcumEngine`, `Reserve`, `FeeRouter`, `AgentRouter`).
2. File log transaksi resminya akan otomatis tersimpan di:
   `contracts/broadcast/Deploy.s.sol/46630/run-latest.json`
3. Verifikasi cepat dari terminal bahwa kontraknya benar-benar sudah hidup di Testnet `46630` (hasilnya harus bytecode panjang, bukan `0x`):

```bash
cast code <ALAMAT_ARCUM_ENGINE_BARU> --rpc-url https://rpc.testnet.chain.robinhood.com
```

### Cara Alternatif: Deploy & Tes On-Chain Satu per Satu Pakai `forge create` + `cast`
Jika ingin deploy bertahap per kontrak atau mengetes fungsi kontrak langsung dari terminal tanpa `Deploy.s.sol`, gunakan `forge create` dan `cast`:

1. **Cek koneksi RPC & saldo gas deployer di `46630`:**
   ```bash
   cd contracts
   source .env
   cast chain-id --rpc-url $TESTNET_RPC_URL        # harus keluar: 46630
   cast balance <ALAMAT_WALLET_KAMU> --ether --rpc-url $TESTNET_RPC_URL
   ```

2. **Deploy kontrak inti pakai `forge create --broadcast`:**
   *(Catat setiap alamat `Deployed to:` yang muncul di terminal ke variabel shell untuk dipakai di langkah berikutnya.)*
   ```bash
   # 1. Deploy MockUSDG (untuk testing + Faucet testnet)
   forge create test/ArcumEngine.t.sol:MockUSDG \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast

   # 2. Deploy PriceGuard & SeriesRegistry
   forge create src/PriceGuard.sol:PriceGuard \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast
   forge create src/SeriesRegistry.sol:SeriesRegistry \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast

   # 3. Deploy WriterPool (delay queue 72 jam = 259200 detik) & ArcumEngine
   forge create src/WriterPool.sol:WriterPool \
     --constructor-args 259200 \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast
   forge create src/ArcumEngine.sol:ArcumEngine \
     --constructor-args $REGISTRY_ADDR $PRICE_GUARD_ADDR $MOCK_USDG_ADDR $POOL_ADDR \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast
   ```

3. **Sambungkan kontrak, pasang harga & daftarkan seri pakai `cast send`:**
   ```bash
   # Set Engine & izinkan token NVDA di SeriesRegistry
   cast send $REGISTRY_ADDR "setEngine(address)" $ENGINE_ADDR \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY
   cast send $REGISTRY_ADDR "setAllowedStock(address,bool)" $NVDA_ADDR true \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY

   # Set harga NVDA = $142.50 (142.5 * 1e18)
   cast send $PRICE_GUARD_ADDR "setMockPrice(address,uint256)" $NVDA_ADDR 142500000000000000000 \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY

   # List seri NVDA Up (Call) Strike $140 Daily (86400s)
   cast send $REGISTRY_ADDR "listSeries(address,bool,uint128,uint32)" $NVDA_ADDR true 140000000000000000000 86400 \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY
   ```

4. **Uji Mint Faucet + Approve + Buy langsung pakai `cast send` & verifikasi `cast call` / `cast receipt`:**
   ```bash
   # Ambil bytes32 seriesId resmi dari SeriesRegistry
   SERIES_ID=$(cast call $REGISTRY_ADDR "idOf(address,bool,uint128,uint32)(bytes32)" \
     $NVDA_ADDR true 140000000000000000000 86400 --rpc-url $TESTNET_RPC_URL)

   # Mint 1,000 MockUSDG (6 desimal) & cek saldo
   cast send $MOCK_USDG_ADDR "mint(address,uint256)" $TESTER_ADDR 1000000000 \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY
   cast call $MOCK_USDG_ADDR "balanceOf(address)(uint256)" $TESTER_ADDR --rpc-url $TESTNET_RPC_URL

   # Approve USDG ke Engine & Buy 10 units (10 * 1e18 WAD)
   cast send $MOCK_USDG_ADDR "approve(address,uint256)" $ENGINE_ADDR 100000000 \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY
   cast send $ENGINE_ADDR "buy(bytes32,uint128,uint128,uint64,address)" \
     $SERIES_ID 10000000000000000000 100000000 9999999999 $TESTER_ADDR \
     --rpc-url $TESTNET_RPC_URL --private-key $PRIVATE_KEY

   # Pastikan receipt status = 1 (Success) dan cek bytecode
   cast receipt <TX_HASH_BUY> --rpc-url $TESTNET_RPC_URL
   cast code $ENGINE_ADDR --rpc-url $TESTNET_RPC_URL
   ```

### Langkah 5 — Masukkan Alamat Baru ke Manifest & Frontend (`web/`)
1. **Update `deployments/46630.json`:**
   Isi dengan alamat asli hasil Langkah 4 (hapus semua alamat karangan / alamat copy-paste dari `4663.json`).
2. **Update `web/src/config/wagmi.ts`:**
   - Ganti `explorer` URL untuk chain `46630` menjadi:
     `https://explorer.testnet.chain.robinhood.com`
   - Pastikan `ARCUM_CONTRACTS` memakai alamat **hasil deploy Testnet `46630` milik sendiri** saat testing di Testnet (bukan `0x1C1f...4687` punya Lemniscate Mainnet), dan ubah chain default/prioritas testing ke `robinhoodTestnet` (`46630`).
3. **Hapus Generator Hash Palsu di `useOnChainTrade.ts` & `TestnetFaucetModal.tsx`:**
   - Hapus blok `const fallbackHash = ... Math.random() ...` di kedua file.
   - Jika transaksi gagal atau revert, **wajib tampilkan pesan error asli** ke user (jangan pernah tampilkan status `Confirmed`).
   - Pakai `waitForTransactionReceipt` dari `wagmi` sebelum menampilkan status sukses dan tombol Explorer.
4. **Perbaiki Parameter Pemanggilan Kontrak (`buy()`):**
   - Ambil `seriesId` langsung lewat `SeriesRegistry.idOf(stockAddress, isCall, strikeWad, tauSeconds)` (bukan `keccak256(stringToHex(...))`).
   - Kirim `units` dalam skala WAD 18 desimal (`parseUnits(String(units), 18)` atau `BigInt(units) * 10n ** 18n`).
   - Untuk tombol **Faucet**, arahkan ke alamat **`MockUSDG` hasil deploy sendiri di `46630`**, dan beri info jelas ke tester bahwa wallet tetap butuh sedikit **ETH Testnet** untuk gas fee.

---

## 4. Perbaikan Tampilan Popup Faucet Agar Menyatu dengan Tema (`web/src/components/TestnetFaucetModal.tsx`)

Popup `Robinhood Testnet Faucet` saat ini warnanya masih tidak menyatu dengan tema *Surplus* di belakangnya (masih memakai sisa komponen lama):
- Modal dibungkus kartu putih terang polos (`bg-arcum-surface`) + box dalam abu-abu (`bg-arcum-card`) + ikon/teks warna-warni (`text-arcum-cyan`, `text-emerald-400`, `text-amber-400`).
- Tombol utamanya masih memakai gradasi glow oranye (`bg-gradient-to-r from-amber-500 to-amber-600 shadow-[0_4px_16px_rgba(245,158,11,0.25)]`) yang terasa "AI slop" di atas kanvas *Surplus* yang seharusnya bersih dan monokrom/editorial.
- Label network di dalam modal masih tertulis **`Robinhood Chain (4663)`**, belum `46630`.

**Harusnya disamakan persis dengan pola modal *Confirm Option Order* di `web/src/pages/DashboardPage.tsx` (`surplus-window`):**
1. **Container modal:** Ganti `bg-arcum-surface border border-arcum-border rounded-2xl ...` menjadi class **`surplus-window`** (otomatis mengikuti `--surplus-ground` dan `--surplus-line` dari halaman aktif: emerald, navy, burgundy, atau parchment Docs).
2. **Header, garis & info card:**
   - Header border: `border-b border-[var(--surplus-line-40)] pb-3`
   - Judul: `font-display font-medium text-lg text-[var(--surplus-line)]`
   - Info box & copy box: pakai `border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)]` (hapus `bg-arcum-card` dan `bg-arcum-surface`), label pakai `text-[var(--surplus-line-62)]`, value pakai `text-[var(--surplus-line)]` (hapus `text-white` & `text-arcum-cyan`).
   - Hapus box ikon oranye `bg-amber-500/20 text-amber-400` di kiri judul agar lebih rapi.
3. **Tombol CTA Faucet:** Ganti tombol gradasi oranye glow menjadi **`stamp-btn py-3.5 w-full text-xs font-bold`** agar seragam dengan tombol `FAUCET`, `CONNECT`, dan `Approve USDG & Execute Buy` di seluruh web.
4. **Teks Network & Address:** Tampilkan `Robinhood Testnet (46630)` dan arahkan ke alamat `MockUSDG` hasil deploy Testnet `46630`.

---

## 5. Temuan Tambahan Lainnya (Bereskan Sekalian Saat Deploy Testnet)

Supaya tidak bolak-balik revisi saat testing nanti, sekalian bereskan 5 hal berikut:

1. **Strike di `Deploy.s.sol` Tidak Cocok dengan Strike di UI (`DashboardPage.tsx`):**
   - `Deploy.s.sol` saat ini baru mendaftarkan 4 seri (`NVDA` `$140`, `$145`, `$137`, dan `TSLA` `$250`).
   - Sementara di `DashboardPage.tsx`, UI menghitung strike otomatis berbasis `2%` harga spot (untuk `NVDA $142.50`, UI menampilkan **`$138, $141, $144, $147, $150`**).
   - **Dampak:** Kalau user klik `$144` di UI, transaksi `buy()` akan langsung **revert (`SeriesNotBuyable`)** karena `$144` tidak pernah didaftarkan di kontrak.
   - **Solusi:** Daftarkan semua strike yang tampil di UI lewat `registry.listSeries(...)` saat deploy (atau arahkan UI membaca strike yang memang terdaftar di `SeriesRegistry`).

2. **Jalur `sell()` & `WriterPool.setModules()` di `Deploy.s.sol` / `ArcumEngine.sol`:**
   - Di `Deploy.s.sol`, `WriterPool.initialize(...)` masih diisi `IOptionEngine(address(0))` sebelum `ArcumEngine` dibuat, dan `pool.setModules(...)` belum dipanggil setelah `ArcumEngine` ter-deploy.
   - Selain itu, `ArcumEngine.sell()` memanggil `USDG.safeTransferFrom(pool, recipient, proceedsUsdg)`, padahal kontrak `WriterPool` tidak pernah memberi `approve` USDG ke Engine (mekanisme pool memakai `pay()` / role engine). Akibatnya di Testnet, **`buy()` bisa jalan tapi `sell()` akan revert** sebelum jalur `WriterPool` disambungkan.

3. **Typo ABI Pool & Tombol yang Masih Simulasi Lokal:**
   - Di `web/src/contracts/abis.ts`, tertulis `requestWithdrawal(uint256 shares)` — yang benar sesuai `WriterPool.sol` adalah **`requestWithdraw(uint256 shares)`**.
   - Di `web/src/pages/DashboardPage.tsx`, baru tombol **Buy Option** dan **Faucet** yang memanggil wallet. Tombol **Close Position** (`sell`), **1-Click Shield** (`shield`), **Writer Pool Deposit / Withdraw**, dan **Revoke Agent Policy** masih simulasi state lokal + toast (belum transaksi on-chain).

4. **Halaman/Elemen Sisa yang Belum Ikut Tema *Surplus* & Masih Memuat Address Lemniscate:**
   - **`web/src/data/protocol.ts`, `ContractsPage.tsx`, `DocsPage.tsx`, `ExitPage.tsx`:** Masih membaca & menampilkan alamat Mainnet milik Lemniscate (`0x1C1f...4687`) serta `twapReference` placeholder (`0x33d8...D0c9`). Harus diganti membaca alamat resmi dari manifest aktif (`46630` untuk Testnet).
   - **`web/src/pages/ProductsPage.tsx` & `LearnPage.tsx`:** Masih memakai styling lama (`bg-arcum-bgElevated`, `text-arcum-cyan`, tombol gradasi `from-arcum-cyan to-arcum-cobalt`), belum disesuaikan ke kanvas *Surplus* (`--surplus-ground`, `--surplus-line`, `stamp-btn`).
   - **`Navbar.tsx` & `LandingPage.tsx` (`Sound on/off`):** Masih toggle visual kosong tanpa audio — lebih baik difungsikan ringan atau dihapus agar tidak membingungkan user.

5. **SPA Fallback Routing di `web/vercel.json`:**
   - Pada update tema *Surplus*, aturan `rewrites` (`/(.*) -> /index.html`) di `web/vercel.json` ikut terhapus. Sebaiknya dikembalikan agar jika user membuka/refresh sub-path langsung di Vercel, tidak terkena error `404`.

---

## 6. Checklist Bukti Pengujian (Yang Harus Dikirim Setelah Deploy)

Agar tidak ada salah paham lagi saat pengecekan, serahkan 4 bukti ini setelah deploy Testnet selesai:

1. **Daftar Alamat Kontrak Baru (`deployments/46630.json`)** yang bisa dibuka langsung di `https://explorer.testnet.chain.robinhood.com/address/<ALAMAT>`.
2. **1 Link Tx Hash Claim Faucet Asli:** `https://explorer.testnet.chain.robinhood.com/tx/0x...`
3. **1 Link Tx Hash Approve + Buy Option Asli:** `https://explorer.testnet.chain.robinhood.com/tx/0x...` yang statusnya **Success** di Chain ID `46630`.
4. **Screenshot Prompt Wallet saat Testing** menunjukkan **`chainId: 46630`** dan address **`to` / `spender`** mengarah ke kontrak hasil deploy Arcum sendiri (bukan `chainId: 4663` dan bukan `0x1c1f...4687`).

> **Catatan untuk Mainnet (`4663`) Nanti:**
> Setelah seluruh alur Testnet `46630` terbukti lancar 100% tanpa error dan tanpa fallback palsu, barulah kita deploy ulang kontrak Arcum ke Mainnet (`4663`) memakai wallet deployer/multisig Arcum sendiri — tetap **bukan** memakai address kontrak milik orang lain.

