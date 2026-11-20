# PANDUAN RECORDING & SHOWCASE VIDEO ARCUM
## "Options that never expire. One formula, proven identical in Solidity, TypeScript and Python."

**Target URL:** `https://arcum-f2tc.vercel.app` (home `/`, trade, positions, shield, pool, agents, docs, contracts, exit)
**Repo:** `https://github.com/wealthy-org/arcum` (perintah CLI dijalankan dari root repo)
**Tujuan Video:** konten X/Twitter (hype), demo pitch, dan bukti teknis untuk developer.
**Hook Utama:** *"Everlasting options on tokenized stocks. No expiry. A closed-form price you can verify three ways: difference 0.00e+00."*

> **Ini versi record tahap 1 (2026-11-12).** Sejak itu kontrak Arcum **sudah dideploy ke testnet `46630` dan terbukti on-chain**. Dokumen ini disimpan sebagai rencana rekaman; status faktual ada di §0 di bawah. Klip yang dulu ditandai 🔒 "terkunci sampai deploy testnet selesai" **sudah boleh direkam** — deploy-nya ada. Yang masih terkunci hanya yang menyebut mainnet produksi `4663`.
>
> **Prinsip: Proof, bukan Promise.** Isi video harus bisa dijalankan ulang atau dibuka orang di explorer. Tampilan boleh dipercantik, angka dan hasilnya tidak boleh dikarang.

---

## 0. Status Produk Saat Rekaman (Baca Dulu)

> **BAGIAN INI SUDAH KEDALUWARSA.** Tabel di bawah menggambarkan kondisi 2026-11-12 (commit `e11f011`). Kondisi faktual per 2026-11-20, dibaca langsung dari RPC testnet oleh `cast`:
>
> | Item | Kondisi sekarang |
> |---|---|
> | Kontrak Arcum di testnet 46630 | **ADA dan berjalan.** `engine 0x98F7B4Ae…280C` punya code (16126 byte), `priceGuard 0x3D541ad6…3dBe` punya code (2691 byte), `writerPoolProxy 0x1F79F6D8…550F` melaporkan `totalAssets = 5.001.600,17 USDG`. Folder `contracts/broadcast/DeployTestnet.s.sol/46630/` ada |
> | USDG di 46630 | `0x0953ac82…3986` — `symbol() = "USDG"`, `decimals() = 6`, dan **punya `mint(address,uint256)`**, jadi faucet memang mungkin di testnet |
> | Kontrak Arcum produksi di mainnet 4663 | **Tetap belum ada.** Yang ada di `4663` hanya stack staging demo (`MockUSDG`). Lihat `docs/MAINNET_READINESS.md` |
> | Tombol Buy mode **Live** | Untuk testnet boleh direkam. Untuk **mainnet** jangan — belum ada kontrak produksi di sana |
> | Eksekusi trade di mode Demo | Tetap simulasi (hash "demo-simulated-tx"), tetap harus diberi label "Demo mode" |
> | Faucet 1.000 Test USDG | **Sudah bisa** di testnet 46630 (USDG punya `mint`). Di 4663 tidak |
> | API `/v1/pool`, `/v1/equities`, `/v1/health` | **Cek dulu sebelum direkam** — kalau masih data hardcode, jangan dijadikan bukti |
> | Vol oracle & timelock | Sudah ada di kode; belum dieksekusi on-chain karena akun testnet belum diisi gas |
>
> Tabel asli 2026-11-12, untuk jejak:

| Item | Kondisi saat panduan ini ditulis (2026-11-12, commit `e11f011`) |
|---|---|
| Kontrak Arcum di testnet 46630 | **Belum ada.** 14 alamat di `deployments/46630.json` kosong di chain (hasil edit dari alamat Lemniscate). Tidak ada folder `broadcast/.../46630` |
| Kontrak Arcum di mainnet 4663 | **Belum ada.** `deployments/4663.json` dan web masih menunjuk ke kontrak milik Lemniscate |
| Tombol Buy mode **Live** | **Jangan diklik saat rekaman.** Di mainnet, wallet diminta approve USDG asli ke kontrak pihak lain. Rekam hanya di **mode Demo** |
| Eksekusi trade di mode Demo | Simulasi (hash "demo-simulated-tx"). Harus diberi label "Demo mode" |
| Faucet 1.000 Test USDG | Butuh MockUSDG hasil deploy sendiri, **belum ada** (🔒) |
| API `/v1/pool`, `/v1/equities`, `/v1/health` | Data hardcode (pool "$2,5 juta", blok tetap, alamat keeper `0x1111…`). **Jangan dijadikan bukti** |
| Matematika (Euler-Cauchy) | **Nyata dan teruji:** forge 32/32, bun 34/34, pytest 8/8, differential 3 bahasa selisih 0 |
| Data mainnet USDG dan token saham | **Asli**, bisa dibaca read-only (lihat Bagian 2) |

**Aturan label wajib di video:**
1. Semua klip UI harus kelihatan atau disebut **"Demo mode"**. Jangan menyebut "live on-chain" atau "deployed".
2. Jangan menampilkan tabel *Smart Contracts Directory*, halaman `/contracts`, tombol Explorer, atau alamat dari `46630.json` sebagai bukti. Semua itu 🔒 sampai deploy nyata.
3. Jangan menampilkan angka pool "$2,5 juta NAV", "18,4% APR", atau status daemon dari `/v1/*` sebagai data live.
4. Simulasi (stress test, gas estimate di fork) harus disebut **simulasi**, bukan hasil di chain.
5. Jangan menyebut "audited" atau "production ready". Skor "A+ 98/100" dari BMAD Guild itu penilaian internal, bukan audit independen.

---

## 1. Strategi Video: Kenapa Ini Menarik di X

Audiens X crypto suka dua hal: **matematika yang bisa dicek** dan **produk yang kelihatan mahal**. Arcum punya keduanya:

**Formula ➡️ Bukti ➡️ Biaya kecil.**
- **Formula:** harga opsi tanpa expiry dihitung lewat solusi tertutup persamaan Euler-Cauchy, dengan parameter alpha dan Greeks. Tidak ada simulasi Monte-Carlo.
- **Bukti:** vektor yang sama dihitung di Solidity, TypeScript, dan Python. Selisih maksimum `0.00e+00`, bisa dijalankan siapa pun dengan satu perintah.
- **Biaya kecil:** deploy seluruh protokol diperkirakan sekitar 26 juta gas, atau kira-kira **$1–2** di Robinhood Chain (simulasi di fork mainnet).

### Urutan edit untuk 1 video utama (45–60 detik)
| Detik | Isi | Klip sumber |
|---|---|---|
| 0–3 | Hook: halaman home dengan rosette berputar | A1 |
| 3–15 | Hover menu → warna latar berubah mulus, lalu Trade terminal | A1, A2 |
| 15–30 | What-If PnL simulator: geser slider, hasil berubah live | A3 |
| 30–45 | Terminal: `differential_test.py` → **0.00e+00** | CLI S4 |
| 45–55 | Terminal: gas simulation di fork mainnet → "~$1–2" | CLI S7 |
| 55–60 | CTA: "Demo mode. Contracts going to testnet next." | A1 |

---

## 2. Data Asli yang Dipakai (Rujukan, Baca Ulang Sebelum Rekam)

> Angka di bawah dibaca atau dijalankan pada 2026-11-12. **Jalankan ulang sebelum merekam** dan pakai angka dari layar, bukan dari tabel ini.

### Matematika: vektor differential (hasil `scripts/differential_test.py`)
| Kasus | Python | TypeScript | Selisih |
|---|---|---|---|
| S=100, K=100, PUT | $0.9253 | $0.9253 | 0.00e+00 |
| S=120, K=100, CALL | $20.0001 | $20.0001 | 0.00e+00 |
| S=142.5, K=145, PUT (NVDA) | $3.0603 | $3.0603 | 0.00e+00 |
| S=585.2, K=600, CALL (SPY) | $1.2660 | $1.2660 | 0.00e+00 |

Lalu skrip menjalankan Foundry untuk `EverlastingMath.price()` dan melaporkan *"Solidity … Vector Parity Confirmed"*.

### Tes otomatis
| Suite | Hasil | Perintah |
|---|---|---|
| Kontrak (Foundry) | 32 lulus | `cd contracts && forge test` |
| Layanan off-chain (Bun) | 34 lulus | `cd app && bun test` |
| Volatility engine (Python) | 8 lulus | `cd vol-engine && .venv/bin/python -m pytest -q` |
| Total | **74 tes** | |

### Biaya deploy (simulasi di fork mainnet, tanpa broadcast)
- Script demo `Deploy.s.sol`: **26.282.023 gas** untuk 32 transaksi (kontrak, library, konfigurasi, 4 series).
- Gas price live saat itu 0,02 gwei → sekitar **0,00053 ETH** (batas atas 0,00105 ETH), atau **sekitar $1–2**.
- Catatan jujur: ini script demo yang memuat Mock. Script mainnet nyata berbeda dan belum ada. Selalu sebut **"simulasi, belum dideploy"**.

### Mainnet (chain 4663) — data asli yang bisa dibaca read-only
| Aset | Alamat | Hasil baca (2026-11-12) |
|---|---|---|
| USDG | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | 6 desimal |
| NVDA (Robinhood Token) | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` | "NVIDIA • Robinhood Token", 18 desimal |
| TSLA (Robinhood Token) | `0x322F0929c4625eD5bAd873c95208D54E1c003b2d` | "Tesla • Robinhood Token", 18 desimal |
| SPY (Robinhood Token) | `0x117cc2133c37b721f49de2a7a74833232b3b4c0c` | "SPDR S&P 500 ETF Trust • Robinhood Token", 18 desimal |
| QQQ | `0xD5f3879160bc7c32ebb4dC785F8a4F505888de68` | ada kodenya (nama belum dibaca) |
| AAPL | `0xaF3D76f1834a1d425780943C99Ea8A608f8a93f9` | ada kodenya (nama belum dibaca) |

Explorer mainnet: `https://robinhoodchain.blockscout.com`
Explorer testnet: `https://explorer.testnet.chain.robinhood.com`

### Kontrak Arcum sendiri
**Belum ada alamat.** Bagian ini diisi dari `deployments/46630.json` setelah deploy testnet selesai (🔒).

---

## 3. Daftar Klip — Bagian A: Rekaman Antarmuka (Mode Demo)

Prioritas: 🔥 = paling berpotensi hype, ⭐ = pendukung kuat, ◻️ = filler / b-roll, 🔒 = menunggu deploy.

> **Sebelum tiap klip:** pastikan toggle jaringan di navbar berada di mode **Demo** dan jangan klik tombol transaksi mode Live. Tutup notifikasi pribadi di browser.

---

### 🔥 Klip A1: Home Plate & Palette Morphing (The Hook Visual)
* **Pesan Utama:** produk ini tampil seperti prospektus institusional yang hidup: kanvas rosette generatif dan warna yang berubah mengikuti halaman.
* **Flow Rekaman:**
  1. Buka `/` di jendela baru. Tunjukkan kanvas **rosette guilloche 100 untai** berputar, logo "A" emerald-glass, wordmark "Arcum", menu **Places** (Trade, Positions, Shield, Pool, Agents, Docs, Contracts), empat figur baseline protokol, dan jam sesi 16:00 ET.
  2. Arahkan kursor **pelan** ke tiap item menu. Tunjukkan **latar berubah dalam ~0,7 detik** (Trade ➡️ biru Prussian, Positions ➡️ burgundy, Shield ➡️ violet, dst.), titik segel vermilion, garis bergelombang, dan teks yang bergeser.
  3. Sorot tombol utama `[ TRADE OPTIONS ]`.
  4. Klik toggle **Sound** sekali untuk menunjukkan soundscape ambient bisa dimatikan.
* **Durasi Target:** ~12 – 15 detik.
* **Caption Ide:** *"Arcum: everlasting options on tokenized stocks. Every page has its own palette."*
* **Catatan:** empat angka baseline di home adalah parameter protokol, bukan statistik live. Jangan di-zoom sebagai data pasar.

---

### 🔥 Klip A2: Trade Terminal — Counter Slip
* **Pesan Utama:** satu halaman untuk memilih saham, arah, kecepatan funding, dan strike, dengan ringkasan order bergaya struk.
* **Flow Rekaman:**
  1. Buka halaman **Trade**. Tunjukkan layout dua kolom: order slip di kiri, receipt dengan dot-leader di kanan.
  2. Klik pill saham: NVDA ➡️ TSLA ➡️ SPY ➡️ QQQ ➡️ AAPL.
  3. Toggle **Up (Call)** ➡️ **Down (Put)**. Toggle **Daily** ➡️ **Weekly**.
  4. Ubah **Quantity**. Klik beberapa baris strike di ledger dan tunjukkan ringkasan kanan berubah seketika (harga, fee 3 bps, Greeks).
  5. Tunjukkan label **mode Demo** di navbar. Jangan menekan tombol beli versi Live.
* **Durasi Target:** ~12 – 15 detik.
* **Caption Ide:** *"Pick the stock, side and speed. Priced by a closed-form formula, not a simulation."*

---

### 🔥 Klip A3: What-If PnL & Decay Simulator (Paling Hype di UI)
* **Pesan Utama:** pengguna bisa melihat untung-rugi dan peluruhan nilai opsi sebelum membeli, langsung dari matematika di browser.
* **Flow Rekaman:**
  1. Scroll ke kartu **What-If PnL** di bawah strike ledger.
  2. Geser **Target Move** (−30% sampai +30%) dan **Holding Horizon** (0 sampai 14 hari). Tunjukkan PnL berubah live.
  3. Klik preset: `Beat +8%`, `Drop -10%`, `Drift +3%`.
  4. Zoom ke net PnL dalam USDG dan efek **norm decay** (funding).
* **Durasi Target:** ~12 – 15 detik.
* **Caption Ide:** *"Move the slider. See your PnL and the decay. Same formula as the contracts."*
* **Catatan:** angka di sini dihitung di sisi klien dengan `pricing.ts`, bukan data on-chain. Sebut itu.

---

### ⭐ Klip A4: Positions — Raw Tokens vs Effective Units (Mode Demo)
* **Pesan Utama:** konsep unik opsi everlasting: token tetap, nilai efektif meluruh.
* **Flow Rekaman:** buka **Positions** (latar burgundy). Sorot kolom Raw tokens, Norm decay factor, Value (USDG), PnL, dan tombol `[ Close / Sell ]`.
* **Durasi Target:** ~8 – 10 detik.
* **Caption Ide:** *"Your token count never changes. Its effective units decay continuously."*
* **Catatan:** data posisi di mode demo adalah contoh. Beri label **"Demo data"**.

---

### ⭐ Klip A5: 1-Click Shield
* **Pesan Utama:** lindungi portofolio saham dengan satu klik, strike dan premi dihitung otomatis.
* **Flow Rekaman:** halaman **Shield** (latar violet). Pilih saham, geser level perlindungan (floor), tunjukkan strike put weekly optimal, estimasi premi, dan tombol aktivasi.
* **Durasi Target:** ~8 – 10 detik.
* **Caption Ide:** *"Set a floor for your stock tokens. Arcum picks the put."*
* **Catatan:** jangan menekan tombol aktivasi. Beri label **Demo mode**.

---

### ⭐ Klip A6: Writer Pool & Aturan Likuiditas
* **Pesan Utama:** sisi penyedia likuiditas: deposit dengan kunci 24 jam dan penarikan lewat antrean 72 jam.
* **Flow Rekaman:** halaman **Pool** (latar sage terang). Tunjukkan kartu Deposit dengan catatan 24 jam, dan kartu Withdrawal Queue dengan catatan 72 jam.
* **Durasi Target:** ~8 – 10 detik.
* **Catatan:** jangan menampilkan angka NAV, APR, atau kapasitas pool sebagai data live (sumbernya hardcode).

---

### ⭐ Klip A7: Agents & MCP
* **Pesan Utama:** agen AI bisa meminta quote dan bertransaksi dalam batas kebijakan yang ditetapkan pemilik.
* **Flow Rekaman:** halaman **Agents** (latar ember). Sorot kebijakan agen (batas harian, batas per trade, saham yang diizinkan) dan klik tombol **Copy MCP config**. Tempel hasilnya di editor untuk menunjukkan konfigurasi.
* **Durasi Target:** ~8 – 10 detik.
* **Caption Ide:** *"Give agents execution rights, bounded by policy. Your wallet stays yours."*
* **Catatan:** angka kebijakan di layar adalah contoh. Jangan menyebutnya kebijakan yang sudah aktif on-chain.

---

### ⭐ Klip A8: Docs Prospektus & Rumus
* **Pesan Utama:** dokumentasi gaya prospektus dengan rumus yang bisa dibuka.
* **Flow Rekaman:** halaman **Docs** (latar parchment). Scroll chapter 01–07 dan buka blok rumus solusi Euler-Cauchy. **Berhenti sebelum tabel *Smart Contracts Directory*** (🔒, lihat Klip T2).
* **Durasi Target:** ~10 detik.
* **Caption Ide:** *"The model is in the docs. The same formula is in the contracts."*

---

### ◻️ Klip A9: Exit Guide (Halaman Statis)
* **Pesan Utama:** panduan keluar mandiri yang bisa diunduh sebagai file HTML offline.
* **Flow Rekaman:** halaman **Exit**. Tunjukkan tombol `[ DOWNLOAD OFFLINE HTML ]`, unduh, lalu buka file hasilnya di browser.
* **Durasi Target:** ~8 detik.
* **Catatan:** perintah `cast` di halaman itu memakai alamat kontrak. **Jangan di-zoom** sampai alamat Arcum nyata tersedia (🔒).

---

### ◻️ Klip A10: Mobile & PWA
* **Pesan Utama:** bisa dipakai di ponsel dan dipasang sebagai aplikasi.
* **Flow Rekaman (ponsel 390 px, DevTools device mode atau perangkat asli):** home ➡️ banner **Install** PWA ➡️ trade dengan stock pills yang bisa digeser ➡️ dock navigasi 5 tab ➡️ Positions sebagai kartu ➡️ bottom sheet **More**.
* **Durasi Target:** ~15 detik.

---

### ◻️ Klip A11: Landing Full Take (Master Utuh, Tanpa Cut)
* **Pesan Utama:** tur utuh produk dari awal sampai akhir, juga dipakai sebagai sumber b-roll.
* **Flow Rekaman:** satu take menerus mulai dari `/` (storage bersih), kecepatan scroll konsisten, melewati semua section dan footer yang ada, lalu kembali ke atas. Rekam satu kali di desktop dan satu kali di ponsel 390 px.
* **Durasi Target:** ~60 – 90 detik (master mentah).

---

## 4. Daftar Klip — Bagian B: Versi CLI / Terminal (Satu Take Panjang)

> Seluruh proses CLI direkam **dalam satu sesi terminal yang menerus**, dari awal sampai akhir, tanpa cut. Setup (clone, install) **tidak direkam**: dev sudah punya repo dan dependency di device-nya.
>
> **Hanya perintah yang hasilnya nyata** yang boleh masuk take ini. Perintah yang saya sudah jalankan sendiri ditandai ✅.

### 🔥 Klip CLI: FULL TAKE (Master Terminal)
* **Pesan Utama:** satu repo, satu terminal: 74 tes, kesamaan matematika tiga bahasa, simulasi stres, data mainnet asli, dan estimasi biaya deploy.
* **Durasi Target:** master mentah ~8 – 12 menit. Versi X: 60–90 detik hasil edit (percepat bagian yang lama).
* **Aturan terminal:** satu jendela satu sesi, font minimal 18 pt, 16:9, prompt pendek, jangan menampilkan `.env`, private key, atau history. VPN aktif untuk segmen yang butuh RPC.

#### S1 — Tes kontrak ✅
```bash
cd contracts && forge test
```
Zoom ke `32 tests passed, 0 failed`.

#### S2 — Tes layanan off-chain ✅
```bash
cd ../app && bun run typecheck && bun test
```
Zoom ke `34 pass, 0 fail`.

#### S3 — Tes volatility engine ✅
```bash
cd ../vol-engine && .venv/bin/python -m pytest -q
```
Zoom ke `8 passed`.

#### S4 — Kesamaan matematika tiga bahasa 🔥 ✅
```bash
cd .. && python3 scripts/differential_test.py
```
Biarkan seluruh tabel vektor mengalir. Zoom ke baris `Max Alpha Diff: 0.00e+00`, `Max Price Diff: 0.00e+00`, `Solidity … Vector Parity Confirmed via Foundry!`, dan `100% Differential 3-Way Parity`.
* **Caption Ide:** *"Same formula, three languages. Maximum difference: 0.00e+00."*

#### S5 — Simulasi stres ekonomi ✅
```bash
python3 scripts/stress_simulation.py
```
Tunjukkan skenario flash crash −15% dan waterfall: Reserve menyerap payout, dampak ke NAV LP 0%.
* **Wajib disebut:** ini **simulasi model**, bukan hasil di chain. Caption harus memuat kata "simulation".

#### S6 — Data mainnet asli, read-only ✅
```bash
RPC=https://robinhood-rpc.publicnode.com
cast call 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 "decimals()(uint8)" --rpc-url $RPC
for t in 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC 0x322F0929c4625eD5bAd873c95208D54E1c003b2d 0x117cc2133c37b721f49de2a7a74833232b3b4c0c; do
  cast call $t "symbol()(string)" --rpc-url $RPC
  cast call $t "name()(string)"   --rpc-url $RPC
done
```
Sorot: USDG 6 desimal; NVDA, TSLA, SPY sebagai token Robinhood asli. Sebutkan: *"Arcum options will be written on these tokens."*
**🖱️ Klik explorer (mainnet):** buka `https://robinhoodchain.blockscout.com/address/0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` dan cocokkan nama token dengan hasil terminal.

#### S7 — Estimasi biaya deploy di fork mainnet 🔥 ✅
```bash
cd contracts
forge script script/Deploy.s.sol --fork-url https://rpc.mainnet.chain.robinhood.com
```
**Tanpa `--broadcast`.** Zoom ke `Estimated total gas used for script: 26,282,023` dan `Estimated amount required: 0.001… ETH`.
* **Wajib disebut:** *"simulation on a mainnet fork, nothing is sent, nothing is deployed."* Dan bahwa ini script demo (memuat Mock), bukan script mainnet final.
* **Caption Ide:** *"Deploying the full protocol: about 26M gas. Roughly the price of a coffee. (Simulation on a mainnet fork.)"*
* **Catatan:** RPC resmi sering terblokir ISP. Pakai VPN. Setelah take, hapus `contracts/broadcast/Deploy.s.sol/4663/dry-run` kalau tidak ingin ada folder itu di repo.

#### S8 — Deploy lokal di Anvil + demo akseptansi (opsional, coba dulu)
```bash
# terminal 1
anvil
# terminal 2
cd contracts && forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
cd ../app && bun run start        # API lokal
cd .. && python3 scripts/full_acceptance_demo.py
```
Hanya boleh direkam kalau hasilnya benar dan jelas **lokal** (chain 31337). Sebut: *"local test chain"*. Skrip `full_acceptance_demo.py` belum saya jalankan, jadi cek dulu sebelum take.

* **Potongan untuk video pendek:** S4 (matematika), S7 (biaya deploy), S5 (stres, dengan label simulasi), S1–S3 (74 tes dipercepat).

### ⛔ Skrip yang TIDAK boleh direkam sebagai bukti (hasilnya diketik di dalam skrip)
| Skrip | Alasan |
|---|---|
| `scripts/agent_quickstart.ts` | Mencetak "Policy Status: ACTIVE (Verified on AgentRouter.sol)" dan "Transaction Broadcast: 0x8f4c…" yang tertulis tetap di kode. Tidak ada transaksi dan tidak ada verifikasi on-chain |
| `scripts/mainnet_dry_run.py` | Simulator dengan verdict "APPROVED / READY FOR PRODUCTION FUNDS" dan sign-off persona AI |
| `scripts/canary_mainnet_fork.py` | Mengaku "live on-chain trade execution" dan "genesis $250k deposit", tapi kontrak Arcum belum ada. Jangan direkam sebelum dicek sungguhan |
| `scripts/qa_full_suite_runner.py` | Sebagian tes hanya memeriksa respons web, bukan chain. Laporan "22/22" tidak boleh dikutip sebagai bukti on-chain |

Kalau salah satunya mau dipakai, perbaiki dulu supaya tiap langkah memanggil chain atau kode sungguhan (polanya ada di `showcase-*.mjs` di repo Vate).

---

## 5. Daftar Klip — Bagian C: Testnet dan Mainnet

### Gerbang (harus selesai dulu)
Semua klip di bagian ini **🔒 terkunci** sampai daftar ini beres. Detail langkahnya ada di `PANDUAN_DEPLOY_TESTNET.md`.

- [ ] Script `DeployTestnet.s.sol` sendiri, deploy dengan wallet tim (`forge script ... --rpc-url testnet --broadcast`).
- [ ] Folder `contracts/broadcast/DeployTestnet.s.sol/46630/run-latest.json` ada dan di-commit.
- [ ] `deployments/46630.json` dibuat **otomatis** dari hasil deploy. `cast code` tiap alamat tidak kosong.
- [ ] Source kontrak terverifikasi di `explorer.testnet.chain.robinhood.com`.
- [ ] Web membaca alamat dari file itu. Semua alamat Lemniscate (`0x1C1f…`) dihapus dari source web.
- [ ] Hash transaksi palsu (`pseudoTxHash` di `app/src/mcp/tools.ts`) dihapus. API `/v1/*` membaca dari chain atau diberi label mock.
- [ ] Smoke test 8 transaksi nyata (faucet, approve, buy, sell, deposit pool, request withdraw, claim, shield) dengan tx hash tercatat.

### 🔒 Klip T1: Showcase CLI Testnet (CLI bergaya showcase, data asli)
* **Pesan Utama:** deploy nyata di testnet, dibaca langsung dari chain.
* **Perintah:** `pnpm showcase:testnet` (atau `bun scripts/showcase-testnet.ts`). **Skrip ini belum ada.** Bangun dengan pola yang sama seperti `showcase-testnet.mjs` di repo Vate: setiap spinner membungkus panggilan nyata, alamat dibaca dari `deployments/46630.json`, tx deploy dibaca balik dari RPC, tanpa angka yang diketik di dalam skrip.
* **Yang harus tampil:** chain 46630 dan blok terbaru, kode ada di semua alamat Arcum, receipt tx deploy (status, block, gas), state kontrak (Engine, WriterPool, Reserve, FeeRouter), aktivitas nyata (faucet, buy, sell, deposit) dari explorer API, dan ringkasan dengan link explorer.
* **🖱️ Klik explorer:** buka tx deploy, alamat Engine (tab Contract terverifikasi), dan satu tx buy dan sell.
* **Durasi Target:** ~60 detik.

### 🔒 Klip T2: Smart Contracts Directory & Register (UI)
* Buka tabel *Smart Contracts Directory* di Docs dan halaman **Contracts**. Klik tombol **Explorer** di tiap baris (semuanya harus membuka halaman kontrak dengan kode, bukan alamat kosong). Hanya boleh direkam setelah gerbang di atas selesai.

### 🔒 Klip T3: Faucet → Buy → Positions di Testnet (UI, Mode Live)
* Klaim faucet MockUSDG, approve tepat, beli opsi, lihat posisi, lalu sell. Buka tx di explorer testnet pada tiap langkah. Label wajib: **Testnet**.

### 🔒 Klip T4: Writer Pool Deposit dan Antrean Withdraw (UI)
* Deposit dengan lock singkat di testnet, request withdraw, tunjukkan tiket antrean, lalu claim. Sebut bahwa parameter waktu testnet dipendekkan.

### 🔒 Klip T5: Shield 1-Click di Testnet (UI)
* Tunjukkan saham mock, aktivasi Shield, put weekly yang terbeli, dan tx di explorer.

### 🔒 Klip T6: Agent via MCP dengan Transaksi Nyata
* Hanya boleh direkam kalau `tools.ts` benar-benar mengirim transaksi lewat AgentRouter dan mengembalikan hash dari receipt. Bukan `pseudoTxHash`.

### Mainnet Arcum
* **Tidak ada klip mainnet Arcum selama kontrak Arcum belum dideploy ke mainnet dan diaudit.** Yang boleh tampil tentang mainnet hanya data read-only token asli (Segmen S6) dan estimasi gas di fork (S7), dengan label "simulasi".
* Setelah mainnet nyata ada: gunakan pola showcase yang sama (`showcase:mainnet`) dan klip deposit kecil dengan persetujuan owner, seperti Klip M2 di panduan Vate.

---

## 6. ⚠️ Checklist Persiapan Sebelum Rekaman

### Teknis
1. `git pull` di device dev. Pastikan commit terbaru.
2. Jalankan semua perintah CLI di Bagian 4 **sekali dulu** sebelum take sungguhan.
3. VPN aktif (RPC resmi Robinhood sering diblokir ISP). Cek `cast chain-id --rpc-url https://rpc.mainnet.chain.robinhood.com` mengembalikan `4663`.
4. Browser: jendela baru, storage bersih, toggle di **mode Demo**.
5. Terminal: font besar, prompt pendek, tidak ada path atau nama pribadi.

### Konten dan keamanan
6. **Jangan menekan tombol beli atau approve mode Live** dalam rekaman mana pun saat ini.
7. Jangan merekam private key, seed phrase, `.env`, atau history terminal. Tutup notifikasi (Discord, WhatsApp, email).
8. Jangan menampilkan tabel kontrak, halaman `/contracts`, tombol Explorer Arcum, atau data `/v1/*` sebagai bukti.
9. Baca ulang semua angka dari layar sebelum menulis caption.
10. Wallet yang tampil di navbar (misalnya `0x91…7681`) adalah wallet nyata tim. Pastikan itu memang boleh ditampilkan.

### Urutan take yang disarankan
11. Rekam **CLI Full Take** dulu (data stabil, tidak butuh wallet).
12. Rekam klip UI A1–A9 di mode Demo.
13. Rekam A10 dan A11 (mobile dan landing full take).
14. Klip 🔒 (T1–T6) hanya setelah gerbang di Bagian 5 selesai.

---

## 7. 💡 Tips Pengambilan Gambar dan Standar Rekam

1. **Resolusi:** 1080p minimum, 4K lebih baik untuk zoom. Browser 100%, fullscreen, tanpa bookmark bar.
2. **Motion dan audio menyala** (rosette, transisi warna, soundscape). Kurangi volume soundscape bila memakai musik editing.
3. **Kursor:** gerakan tenang dan terarah. Aktifkan highlight klik.
4. **Zoom:** pada angka kunci (`0.00e+00`, `32 passed`, gas estimate), maksimal 2× per klip.
5. **Versi vertikal 9:16** untuk X: crop tengah pada A2, A3, dan CLI S4 serta S7.
6. **Caption hardcode** dalam bahasa Inggris, maksimal 2 baris per layar.
7. **Penamaan file:**

| File | Isi |
|---|---|
| `a01_home_palette_morph.mp4` | Klip A1 |
| `a02_trade_terminal.mp4` | Klip A2 |
| `a03_whatif_pnl_simulator.mp4` | Klip A3 |
| `a04_positions_decay.mp4` | Klip A4 |
| `a05_shield.mp4` | Klip A5 |
| `a06_writer_pool.mp4` | Klip A6 |
| `a07_agents_mcp.mp4` | Klip A7 |
| `a08_docs_formula.mp4` | Klip A8 |
| `a09_exit_guide.mp4` | Klip A9 |
| `a10_mobile_pwa.mp4` | Klip A10 |
| `a11_landing_full_take.mp4` / `a11b_landing_mobile_full_take.mp4` | Klip A11 (desktop dan ponsel) |
| `c0_cli_full_take.mp4` | CLI Full Take (master mentah) |
| `t1_showcase_testnet.mp4` | 🔒 Klip T1 |
| `t2_contracts_directory.mp4` | 🔒 Klip T2 |
| `t3_faucet_buy_positions.mp4` | 🔒 Klip T3 |
| `t4_pool_deposit_withdraw.mp4` | 🔒 Klip T4 |
| `t5_shield_testnet.mp4` | 🔒 Klip T5 |
| `t6_agent_mcp_real_tx.mp4` | 🔒 Klip T6 |

---

## 8. 🐦 Ide Thread X (Urutan Posting)

1. **Video utama (45–60 detik):** hook, palette morph, What-If simulator, `0.00e+00`, biaya deploy. *"Everlasting options on tokenized stocks. No expiry. One formula, verified in three languages."*
2. **Reply 1 (CLI S4):** vektor dan `0.00e+00`, dengan perintah yang bisa dijalankan siapa pun.
3. **Reply 2 (A3):** What-If simulator, *"Same math as the contracts. Demo mode."*
4. **Reply 3 (CLI S7):** biaya deploy ±26M gas, *"simulation on a mainnet fork."*
5. **Reply 4 (CLI S1–S3):** 74 tes.
6. **Reply 5 (CLI S6):** token saham Robinhood asli di mainnet, *"options will be written on these."*
7. **Reply 6 (CTA, jujur):** *"Demo mode today. Contracts go to testnet next."* Setelah gerbang Bagian 5 selesai, tambahkan thread kedua dengan klip T1–T3.

---

## 9. Yang Sengaja Tidak Boleh Muncul Di Video

- Klaim "live on testnet/mainnet", "deployed", "audited", "production ready", atau "100% verified".
- Tabel *Smart Contracts Directory*, `/contracts`, dan tombol Explorer sebelum deploy nyata.
- Alamat Lemniscate (`0x1C1f…`, `0x67fF…`) sebagai kontrak Arcum.
- Angka pool "$2,5 juta NAV", "18,4% APR", status daemon, dan alamat keeper `0x1111…`.
- Output `agent_quickstart.ts`, `mainnet_dry_run.py`, `canary_mainnet_fork.py`, atau laporan QA "22/22" sebagai bukti.
- Tombol beli mode Live yang ditekan di mainnet.
- Sign-off "BMAD Guild" sebagai pengganti audit independen.
