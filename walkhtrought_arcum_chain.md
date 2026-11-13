# Panduan: Deploy Testnet Arcum yang Benar

> Untuk: tim developer Arcum
> Tanggal cek: 2026-11-12 (repo commit `e11f011`)
> Isi: dasar on-chain, kenapa `deployments/46630.json` yang sekarang salah, dampaknya, dan cara memperbaikinya dengan wallet kita sendiri.

Dokumen ini bukan untuk menyalahkan. Test suite, matematika, dan frontend Arcum sudah bagus. Yang belum ada adalah satu langkah dasar: **kontrak Arcum belum pernah benar-benar dideploy ke chain mana pun**. Langkah itu yang dijelaskan di sini.

---

## 1. Dasar-dasar

### On-chain itu apa
Sesuatu disebut *on-chain* kalau datanya tersimpan di blockchain, bukan di server kita. Siapa pun bisa membukanya di explorer tanpa percaya pada kita. Kalau cuma ada di repo, di JSON, atau di website, itu *off-chain*.

### Smart contract dan deploy
- **Smart contract** = program yang hidup di blockchain.
- **Deploy** = mengirim transaksi yang berisi bytecode kontrak ke chain. Chain lalu membuat kontrak itu dan **memberinya alamat**.
- Alamat kontrak **dihasilkan oleh chain** dari alamat deployer dan nonce-nya. Alamat tidak bisa dipilih atau diketik sendiri.
- Deploy butuh **wallet deployer** yang punya ETH untuk membayar gas. Wallet itu menandatangani transaksinya.

Kalau belum ada transaksi deploy, **alamatnya belum ada**. Alamat di file JSON tidak membuktikan apa-apa.

### Testnet vs mainnet

| | Testnet | Mainnet |
|---|---|---|
| Chain ID Robinhood Chain | `46630` | `4663` |
| Uang | Palsu. ETH dari faucet, gratis | Asli. Gas dan USDG bernilai |
| Fungsi | Latihan dan uji coba, boleh gagal | Produksi, kesalahan berarti kerugian |
| Token (USDG, saham) | Tidak ada. Kita buat versi mock sendiri | USDG dan token saham asli sudah ada |
| Explorer | `explorer.testnet.chain.robinhood.com` | `robinhoodchain.blockscout.com` |
| Boleh pakai Mock? | **Boleh dan perlu** | **Tidak boleh sama sekali** |

Kontrak yang dideploy di testnet **bukan** kontrak yang sama dengan di mainnet. Testnet dan mainnet adalah dua chain terpisah. Kita deploy dua kali, dan alamatnya berbeda.

### Cara memeriksa apakah sebuah kontrak benar-benar ada
```bash
cast code <ALAMAT> --rpc-url https://rpc.testnet.chain.robinhood.com
```
- Hasil `0x` berarti **kosong, tidak ada kontrak**.
- Hasil panjang berarti **ada kontrak**.

Cara kedua: tempel alamat di kolom search explorer. Kalau ada riwayat transaksi pembuatnya, kontrak itu nyata.

---

## 2. Apa yang salah sekarang

Hasil cek ke chain (RPC testnet dan mainnet) pada 2026-11-12:

### Temuan 1: Semua alamat testnet kosong
Seluruh **14 alamat** di `deployments/46630.json` (Engine, WriterPool, AgentRouter, UniswapV3Twap, Reserve, FeeRouter, Timelock, USDG, 5 stock token) hasilnya **`0x` di testnet**. Tidak ada satu pun kontrak di sana.

**Bukti kedua dari sisi repo: tidak ada catatan deploy.** Setiap deploy sungguhan meninggalkan jejak di `contracts/broadcast/<NamaScript>/<chainId>/run-latest.json` (berisi tx hash dan alamat kontrak). Untuk Arcum:
- Folder `broadcast/.../46630/` **tidak ada**. Artinya tidak pernah ada deploy ke testnet dari repo ini.
- Tidak ada script deploy yang menargetkan 46630. Satu-satunya script, `Deploy.s.sol`, dibuat untuk Anvil lokal (chain 31337).
- `deployments/46630.json` hanya muncul lewat commit docs/audit, bukan lewat hasil deploy.

Jadi `46630.json` adalah file yang diketik, bukan catatan hasil deploy. Itulah dasar menyebutnya belum terkonfirmasi: **data deploy Arcum yang asli tidak ada di direktori mana pun.**

### Temuan 2: Alamat itu dikarang dari alamat Lemniscate
Alamat testnet adalah alamat mainnet Lemniscate yang diubah beberapa karakter depannya:

| Kontrak | Mainnet (milik Lemniscate) | Testnet di JSON kita |
|---|---|---|
| Engine | `0x1C1f4172...` | `0x2A1f4172...` |
| WriterPool | `0x67fF1306...` | `0x77fF1306...` |
| AgentRouter | `0x0Dd88438...` | `0x1Dd88438...` |
| Reserve | `0x2f719703...` | `0x3f719703...` |
| Timelock | `0x58c276f4...` | `0x68c276f4...` |

Ada juga `0xG69F...` yang bukan hex valid (karakter `G` tidak ada di hex). Ini tanda alamat diketik tangan.

### Temuan 3: Mainnet menunjuk ke kontrak orang lain
`deployments/4663.json` dan web ([wagmi.ts:56](repo/web/src/config/wagmi.ts), [protocol.ts:13](repo/web/src/data/protocol.ts)) masih memakai alamat Lemniscate (`0x1C1f...`). File `upstream-reference.json` sendiri menandainya "NEVER used as Arcum operational keys or production target". Kontrak itu ada di chain, tapi **bukan milik kita**.

### Temuan 4: Klaim "sudah verified" tidak benar
- `46630.json` berisi `"verified": true`, padahal kontraknya tidak ada.
- Web menulis "Arcum contracts are currently in active staging on Testnet (46630)" ([DocsPage.tsx:161](repo/web/src/pages/DocsPage.tsx)). Itu tidak benar.
- Tombol **Explorer** di tabel Docs membuka halaman alamat yang kosong.

### Temuan 5: Sisa data palsu
- [app/src/mcp/tools.ts:241](repo/app/src/mcp/tools.ts) masih membuat `pseudoTxHash` dengan `Math.random()` dan mengembalikan `success: true`.
- `/v1/pool/stats` dan `/v1/equities` mengembalikan JSON yang sama (hasil satu contoh perhitungan, bukan data harga).
- `/v1/pool` menampilkan NAV $2,5 juta dan APR 18,4%, padahal tidak ada pool di chain.
- `/v1/health` menampilkan alamat `0x1111...`, `0x2222...`, `0x3333...` dan `lastBlock` yang tidak cocok dengan block asli.

---

## 3. Dampak kalau dibiarkan memakai alamat karangan

| Situasi | Yang terjadi | Siapa yang rugi |
|---|---|---|
| User klik **Buy** di testnet | Transaksi dikirim ke alamat kosong. Wallet sering menganggapnya transfer biasa, jadi ETH bisa terkirim ke alamat yang tidak punya kontrak dan **tidak bisa kembali** | User, nama baik kita |
| User klik **Buy** di mainnet | Wallet meminta `approve` USDG asli ke kontrak Lemniscate. Kita menyuruh user memberi izin ke kontrak **milik pihak lain** | **Uang asli user**, dan risiko hukum |
| Alamat karangan kebetulan milik orang lain | Karena sebagian karakter diubah acak, bisa saja alamat itu milik wallet atau kontrak orang. Dana yang dikirim ke sana hilang | User |
| Tombol Explorer dibuka investor atau auditor | Halaman kosong. Seluruh klaim "verified" langsung diragukan | Kredibilitas proyek |
| Klaim "100% PASS, production ready" | Laporan QA lulus karena yang dites hanya kode dan tampilan, bukan on-chain. Keputusan bisnis (modal seed $250 ribu) bisa diambil atas dasar laporan yang tidak mencerminkan kenyataan | Pemilik modal |
| Auditor atau tim BD memeriksa | Satu temuan palsu cukup untuk membuat seluruh dokumen diragukan, termasuk bagian yang sebenarnya benar | Seluruh tim |

Intinya: **kode yang lulus test tidak sama dengan sistem yang jalan di chain.** Yang membuktikan sistem jalan adalah transaksi nyata yang bisa dibuka di explorer.

---

## 4. Solusi: deploy testnet pakai wallet kita sendiri

Prinsipnya sederhana: **alamat tidak boleh diketik, harus diambil dari hasil deploy.**

### Langkah 0: Siapkan wallet deployer
1. Buat wallet baru khusus deployer testnet. Jangan pakai wallet pribadi yang berisi uang.
2. **Jangan pernah memakai private key default Anvil** (`0xac0974...`). Key itu publik dan semua orang tahu.
3. Simpan key lewat keystore, bukan di file `.env` yang masuk git:
   ```bash
   cast wallet import arcum-deployer --interactive
   ```
4. Minta ETH testnet dari faucet resmi Robinhood Chain (cari di dokumentasi mereka). Gas testnet sekarang sekitar 0,3 gwei. Satu kali deploy butuh jauh di bawah 0,05 ETH.

### Langkah 1: Tulis script deploy testnet baru
Buat `contracts/script/DeployTestnet.s.sol`. **Jangan** memakai `Deploy.s.sol` yang sekarang, karena itu script demo untuk Anvil lokal (alamat stock token di dalamnya adalah alamat mainnet).

Isi yang perlu dideploy di testnet:
- `MockUSDG` (6 desimal) dengan fungsi faucet yang dibatasi per alamat.
- `MockStock` (ERC-20, 18 desimal) untuk NVDA, TSLA, SPY, QQQ, AAPL. Di testnet alamat saham asli tidak ada, jadi kita buat sendiri.
- Library matematika, lalu `PriceGuard`, `SeriesRegistry`, `WriterPool` (implementation + proxy), `ArcumEngine`, `Reserve`, `FeeRouter`, `AgentRouter`.
- Parameter waktu pendek supaya bisa dites cepat: deposit lock 5 menit dan withdrawal queue 30 menit (sudah ada di `46630.json`).
- Harga lewat `setMockPrice` itu **boleh di testnet**, tapi harus ada keeper yang meng-update-nya.

Di akhir script, tulis alamat hasil deploy ke file JSON secara otomatis:

```solidity
string memory k = "deploy";
vm.serializeAddress(k, "usdg", address(usdg));
vm.serializeAddress(k, "engine", address(engine));
vm.serializeAddress(k, "writerPoolProxy", address(pool));
vm.serializeAddress(k, "writerPoolImpl", address(poolImpl));
vm.serializeAddress(k, "agentRouter", address(agentRouter));
vm.serializeAddress(k, "reserve", address(reserve));
vm.serializeAddress(k, "feeRouter", address(feeRouter));
vm.serializeAddress(k, "priceGuard", address(priceGuard));
vm.serializeAddress(k, "seriesRegistry", address(registry));
string memory out = vm.serializeUint(k, "chainId", block.chainid);
vm.writeJson(out, string.concat("../deployments/", vm.toString(block.chainid), ".json"));
```

Tambahkan izin tulis di `contracts/foundry.toml`:
```toml
fs_permissions = [{ access = "read-write", path = "../deployments" }]
```

> Catatan: potongan kode di atas adalah pola standar Foundry, belum diuji di repo ini. Sesuaikan nama variabel dengan script yang ada.

### Langkah 2: Simulasi dulu, baru kirim
```bash
cd contracts
# simulasi tanpa kirim transaksi (cek gas dan error)
forge script script/DeployTestnet.s.sol \
  --rpc-url https://rpc.testnet.chain.robinhood.com \
  --account arcum-deployer

# kirim sungguhan
forge script script/DeployTestnet.s.sol \
  --rpc-url https://rpc.testnet.chain.robinhood.com \
  --account arcum-deployer \
  --broadcast
```
Hasil transaksi tersimpan di `contracts/broadcast/DeployTestnet.s.sol/46630/run-latest.json`. Folder `46630` itu **harus ada** dan harus di-commit sebagai bukti.

### Langkah 3: Periksa hasilnya
```bash
# setiap alamat di deployments/46630.json harus mengembalikan kode, bukan 0x
cast code <ALAMAT> --rpc-url https://rpc.testnet.chain.robinhood.com
```
Lalu buka tiap alamat dan satu tx hash deploy di `explorer.testnet.chain.robinhood.com`.

### Langkah 4: Verifikasi source di explorer
Explorer testnet berbasis Blockscout. Gunakan verifier Blockscout dari Foundry:
```bash
forge verify-contract <ALAMAT> src/ArcumEngine.sol:ArcumEngine \
  --chain-id 46630 --verifier blockscout \
  --verifier-url https://explorer.testnet.chain.robinhood.com/api/
```
Cek ulang URL API verifier di dokumentasi Robinhood Chain. Setelah benar-benar terverifikasi, baru boleh menulis "verified".

### Langkah 5: Hubungkan web ke alamat hasil deploy
- Web membaca alamat dari `deployments/<chainId>.json` sesuai chain yang dipilih.
- **Hapus** semua hardcode alamat Lemniscate (`0x1C1f...`) dari `wagmi.ts` dan `protocol.ts`.
- Tab "Mainnet (4663)" di Docs: tampilkan "belum dideploy" sampai mainnet benar-benar selesai. Jangan tampilkan alamat Lemniscate.
- Hapus teks "active staging on Testnet" sampai langkah 3 benar-benar lulus.
- Ganti link explorer testnet yang masih memakai `testnet.robinhoodchain.blockscout.com` (`wagmi.ts` sekitar baris 98) menjadi `explorer.testnet.chain.robinhood.com`.

### Langkah 6: Bersihkan data palsu di backend
- Ubah `pseudoTxHash` di `tools.ts:241`: kirim transaksi sungguhan lewat viem dan kembalikan hash dari receipt. Kalau tidak bisa, kembalikan error, jangan `success: true`.
- `/v1/pool`, `/v1/equities`, `/v1/health`: baca dari kontrak dan indexer yang benar-benar jalan, atau beri label jelas `"mock": true`.

### Langkah 7: Smoke test lewat wallet sungguhan
Jalankan satu per satu dari web dan **catat tx hash**. Setiap baris harus bisa dibuka di explorer:

| # | Aksi | Hasil yang diharapkan | Tx hash |
|---|---|---|---|
| 1 | Claim faucet MockUSDG | Saldo MockUSDG bertambah | |
| 2 | Approve USDG ke Engine | Allowance tercatat | |
| 3 | Buy opsi (NVDA Up) | Posisi muncul di `/positions` | |
| 4 | Sell posisi | USDG kembali, posisi tertutup | |
| 5 | Deposit ke Writer Pool | Terima share AWP, lock 5 menit | |
| 6 | Request withdrawal | Tiket antrean muncul | |
| 7 | Claim setelah antrean selesai | USDG kembali | |
| 8 | Shield (beli put) | Put terbeli | |

### Langkah 8: Barulah mainnet
Mainnet **memakai script terpisah** (`DeployMainnet.s.sol`), bukan script testnet yang diganti RPC-nya. Perbedaannya:

| Komponen | Testnet | Mainnet |
|---|---|---|
| USDG | `MockUSDG` buatan sendiri | USDG asli `0x5fc5...f168` |
| Token saham | `MockStock` | Alamat token saham asli |
| Harga | `setMockPrice` + keeper | Oracle asli (belum diputuskan, lihat `OWNER_DECISIONS.md`) |
| Waktu | Lock 5 menit, queue 30 menit | Lock 24 jam, queue 72 jam |
| Admin | Wallet deployer | Timelock 48 jam di belakang multisig |
| Mint ke pool | Boleh (mock) | Tidak mungkin. Seed lewat deposit USDG asli |

Estimasi biaya gas deploy mainnet (hasil simulasi di fork 4663): sekitar 26 juta gas, atau **sekitar $1-3**. Biaya besar ada di audit dan modal seed, bukan di gas.

---

## 5. Checklist selesai (Definition of Done)

Testnet dianggap selesai kalau **semua** poin ini bisa dibuktikan:

- [ ] `contracts/broadcast/DeployTestnet.s.sol/46630/run-latest.json` ada di repo
- [ ] `deployments/46630.json` dibuat otomatis dari hasil deploy, bukan diketik
- [ ] `cast code` tiap alamat di file itu tidak kosong
- [ ] Source terverifikasi di explorer testnet
- [ ] Web membaca alamat dari file itu, tidak ada alamat Lemniscate di source web
- [ ] Tabel smoke test di atas terisi 8 tx hash nyata
- [ ] Tidak ada `Math.random()` yang menghasilkan hash transaksi (cek `grep -rn "Math.random" web/src app/src`)
- [ ] Endpoint API yang masih mock diberi label mock
- [ ] Laporan QA ditulis ulang dan menyebut hasil on-chain, bukan hanya test lokal

## 6. Aturan yang harus dipegang

1. **Alamat kontrak tidak pernah diketik atau diedit manual.** Alamat selalu berasal dari hasil broadcast.
2. **"Verified" hanya ditulis setelah benar-benar terverifikasi** di explorer.
3. **Mock hanya untuk testnet dan lokal.** Mainnet selalu aset dan oracle asli.
4. **Jangan pakai kontrak Lemniscate sebagai target.** Boleh dibaca untuk referensi, tidak boleh jadi tujuan transaksi user.
5. **Private key tidak masuk git.** Pakai keystore atau secret manager. Key yang pernah masuk repo dianggap bocor dan diganti.
6. **Setiap klaim di laporan harus bisa dibuktikan dengan satu perintah atau satu link.**

---

## 7. Penutup

Pekerjaan yang sudah ada (matematika, test, tampilan, MCP server) tetap bernilai dan bisa dipakai apa adanya. Yang perlu ditambah adalah deploy sungguhan, lalu laporan yang berdasarkan bukti on-chain. Kalau langkah 0 sampai 7 selesai, kita punya demo testnet yang bisa dibuka investor atau auditor dan semuanya terlihat nyata di explorer.
