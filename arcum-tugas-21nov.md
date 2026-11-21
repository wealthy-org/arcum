# Arcum: Status dan Daftar Pekerjaan (21 Nov 2026)

> **Repo:** `wealthy-org/arcum` @ `74e99cd` · **Acuan:** `ARCUM_ROBINHOOD_DEV_BRIEF.md` (4 Nov) · **Dicek:** 21 Nov 2026
> **Stack mainnet yang dicek:** `deployments/4663-production.json` (deploy 21 Nov), yang dipakai web arcumpool.xyz.
> Semua angka on-chain di bawah dibaca langsung dari `rpc.mainnet.chain.robinhood.com` pada 21 Nov.

## 1. Ringkasan

Kode Arcum sudah lengkap dan test-nya hampir semua lulus. Stack produksi sudah di-deploy ke **mainnet 4663** dengan USDG asli dan feed Chainlink asli, dan web live sudah mengarah ke sana.

**Tapi stack mainnet belum bisa dipakai, dan ada satu masalah keamanan yang harus ditutup sebelum ada deposit:**

1. **Deployer EOA masih admin WriterPool.** Dompet `0xf3E8…9a0b` masih punya `DEFAULT_ADMIN_ROLE`, jadi bisa meng-upgrade kontrak pool sendirian.
2. **Safe owner `0xf2EF…60db` belum ada di mainnet.** Semua fungsi owner (pause, tambah series, ganti parameter) tidak bisa dijalankan.
3. **Series nol.** Tidak ada yang bisa dibeli user.
4. **Pool kosong** (`totalSupply = 0`). Belum ada dana user yang berisiko, jadi sekarang waktu yang tepat untuk membereskan semuanya.

| Ukuran | Status |
|---|---|
| Kode dan test kontrak | 150 dari 151 lulus (1 gagal karena butuh relay lokal, lihat D6) |
| Testnet 46630 | Jalan, belum dicek ulang kali ini |
| Mainnet 4663 | Ter-deploy, **belum siap dipakai** |
| CI otomatis | **Tidak ada** (tidak ada `.github/workflows`, hanya build Vercel) |

## 2. Kondisi on-chain mainnet

| Kontrak | Alamat | Temuan |
|---|---|---|
| ArcumEngine | `0x7b6D4Dd487DAdCE5f59631055E4f8B8c472B5A7D` | Owner = Safe (belum ada di chain) |
| WriterPool (proxy) | `0x19fD1A8b7C669d5CBaFFc077B50B144DBAB11D6e` | Admin = **Safe dan deployer**. `totalSupply = 0`. Engine sudah tersambung |
| SeriesRegistry | `0x3D525dbB8e7973E46023c9Ad05E6803B82AC408C` | Owner = Safe. **`seriesCount = 0`**. NVDA, AAPL, dan QQQ sudah diizinkan |
| PriceGuardProd | `0x13eEC2572612eA55b6cA55726FAF64a9536b210D` | Owner masih deployer, `pendingOwner` = Safe. Feed Chainlink terpasang dan harga terbaca: NVDA ±$130,00, AAPL ±$344,55, QQQ ±$617,20 |
| VolOracle | `0x3aB5Adf52ae9FEb20700868Eb6D5ee077F7D1Ed5` | Owner masih deployer, `pendingOwner` = Safe. Sigma pernah diposting, tapi `sigmaFor` mengembalikan **`ok = false` untuk ketiga saham** |
| FeeRouter | `0x26EEC4165FEaF725278d543D0920959838aE8dB6` | Owner = Safe |
| Reserve | `0x60Bd8FDAf25c19d460eaCFf4FBA609bE81Fd39f5` | Admin = Safe, deployer bukan admin |
| USDG | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | Sama dengan alamat di `upstream-reference.json` |
| Safe owner | `0xf2EFC16D920175C8805fCF21DcD0c420691b60db` | **Tidak ada kode di 4663.** Di testnet ada (2-of-2, owner `0x1d9f…6c2` dan `0x3279…2f67`) |

Catatan:
- Script `DeployProduction.s.sol` baris 249–254 hanya mencabut admin deployer kalau `RENOUNCE_DEPLOYER=true`. Deploy dijalankan tanpa itu.
- `docs/MAINNET_READINESS.md` sendiri menulis: jangan deploy "sebelum Safe yang akan menjadi owner terbukti bisa menandatangani". Urutan itu terbalik.
- Penambahan series pertama butuh owner registry (Safe). Jadi selama Safe belum ada, series tetap nol.
- Infrastruktur Safe v1.4.1 (factory `0x4e1DCf7A…` dan singleton `0x41675C09…`) sudah ada di 4663, jadi Safe bisa dibuat di sana.

## 3. Brief vs yang sudah dikerjakan

Legenda: ✅ ada dan terbukti · 🟡 ada di kode, belum terbukti di mainnet · ❌ belum ada · ⚪ memang tahap belakangan

| Brief §4 | Modul | Status | Catatan |
|---|---|---|---|
| Up/Down trading | Pilih nama, speed, strike, quote, buy, sell | 🟡 | Kode ada. Mainnet: 0 series, jadi belum bisa trading |
| Holding cost | Effective units, norm, accrual | 🟡 | Kode dan test ada. Keeper accrue berjalan di testnet |
| Shield | Cek holding, beli put | 🟡 | Kode ada. Belum ada series put di mainnet |
| Writer Pool | Deposit, share, lock, request/claim/requeue | 🟡 | Kode ada. Pool mainnet kosong |
| Price guard | Session, harga fresh, halt, TWAP | 🟡 | `PriceGuardProd` memakai `latestRoundData` dan feed mainnet terbaca. **TWAP mati** (`twapReference = 0x0`); dev beralasan belum ada pool berlikuiditas |
| Volatility | Pipeline, signing, posting | 🟡 | Scheduler mainnet ada (`fcfd56e`), tapi sigma di chain sekarang tidak valid |
| Risk | Cap, stress, drawdown | 🟡 | Ada di kode, belum diuji ulang kali ini |
| Hedging | Spot hedge di pool | 🟡 | `app/src/hedger` ada. Belum ada bukti berjalan di mainnet |
| Fees/reserve | Fee, reserve, distribusi | 🟡 | Kontrak ter-deploy, belum ada transaksi |
| Agent/MCP | Policy, budget, revoke | 🟡 | AgentRouter ter-deploy. MCP sudah dicek sebelumnya |
| AA | Smart account, paymaster | ❌ | Dev sendiri mencatat deposit paymaster 0 wei (`MAINNET_READINESS.md` #22) |
| Receipts/indexing | Activity, NAV history, reorg | 🟡 | `app/src/indexer` ada. `deployBlock: 0n` di `web/src/config/wagmi.ts`, jadi pembacaan event dimulai dari block 0 |
| Marketing/dashboard | Halaman dan tab | ✅ | Live di arcumpool.xyz |
| Writer rewards | Poin dan payout | 🟡 | `app/src/rewards` ada. Program dan token belum diputuskan owner |
| Writer vaults dan token modules | CoveredUp, CashDown, staking, buy/burn | ⚪ | Source ada. Sesuai brief, belum diaktifkan |
| Operations/exit | `/exit`, runbook | 🟡 | `ExitPage.tsx` ada. Belum dicek apakah panduannya memakai alamat mainnet baru |

**Brief §22 (build):** brief meminta CI yang benar-benar menjalankan pemeriksaan. Repo ini tidak punya CI sama sekali.

**Brief §24 (12 demo acceptance):** belum ada satu pun demo di mainnet, karena series nol dan pool kosong.

## 4. Pekerjaan untuk dev

| # | Pekerjaan | Hasil yang diminta | Prioritas |
|---|---|---|---|
| D1 | Deployer `0xf3E8…9a0b` mencabut `DEFAULT_ADMIN_ROLE` dirinya di WriterPool | `hasRole(0x00, deployer) = false`. Bisa dilakukan sekarang tanpa Safe, cukup deployer memanggil `renounceRole` | 🔴 Pertama, sebelum ada deposit |
| D2 | Buat Safe `0xf2EF…60db` di mainnet 4663 dengan owner, threshold, salt, dan versi yang sama seperti di testnet | Ada kode di alamat itu, `getOwners` dan `getThreshold` sama dengan testnet. Lampirkan tx pembuatannya | 🔴 |
| D3 | Safe memanggil `acceptOwnership` di PriceGuardProd dan VolOracle | `owner()` = Safe, `pendingOwner()` = 0 di kedua kontrak | 🔴 Setelah D2 |
| D4 | Daftarkan series mainnet (NVDA, AAPL, QQQ) lewat Safe | `seriesCount > 0`, lengkap dengan daftar series dan tx-nya | 🟠 Setelah D2 |
| D5 | Pastikan publisher vol mainnet berjalan | `sigmaFor(...)` mengembalikan `ok = true` saat pasar buka, plus alamat publisher dan log posting. Sekarang `ok = false` untuk ketiga saham. Kalau ini karena akhir pekan, jelaskan dan tunjukkan posting saat pasar buka | 🟠 |
| D6 | Perbaiki `contracts/test/SafeHandover.t.sol` | Test tidak bergantung pada relay `127.0.0.1:8547`: RPC dari env, atau di-skip kalau env tidak diisi. Sekarang test ini gagal di mesin selain mesin dev | 🟡 |
| D7 | Tambahkan CI GitHub Actions | Minimal `forge test`, Slither, test `app/`, dan build `web/`. CI harus hijau di commit terbaru | 🟠 |
| D8 | Lengkapi `deployments/4663-production.json` | Tambahkan deployer, block deploy, tx deploy, dan link verifikasi Blockscout. Isi `deployBlock` yang benar di `wagmi.ts` | 🟡 |
| D9 | Beri label jelas pada `deployments/4663.json` | Tandai sebagai stack lama (key bocor, MockUSDG) yang tidak dipakai, supaya tidak tertukar | 🟡 |
| D10 | Cek halaman `/exit` | Panduan memakai alamat mainnet produksi, bukan alamat lama atau testnet | 🟡 |
| D11 | Verifikasi kontrak di Blockscout mainnet | Semua kontrak produksi verified. API Blockscout memblokir akses saya (403), jadi status ini belum bisa saya cek | 🟡 |
| D12 | Jalankan demo acceptance brief §24 di mainnet dengan dana uji kecil | Minimal: deposit writer, buy, sell, dan claim, masing-masing dengan link tx | 🟠 Setelah D1–D5 |

## 5. Yang sudah bagus

- Tidak ada lagi kontrak produksi yang dikendalikan key bocor `0x1B4F…3e45`. Stack lama di testnet juga sudah dipindah ke timelock (commit `1b09b90`, `28f2cde`, `4b1fc84`).
- PriceGuard produksi membaca Chainlink dengan `latestRoundData` dan try/catch, dan harganya masuk akal.
- Memakai USDG asli, bukan MockUSDG.
- 150 test kontrak lulus saat dijalankan ulang.
- Dokumen `MAINNET_READINESS.md` jujur mencatat kekurangannya sendiri.

## 6. Yang belum diverifikasi

- Status verifikasi kontrak di Blockscout mainnet (API memblokir dengan 403).
- Test `app/`, `web/`, dan `vol-engine/` (hanya test kontrak yang dijalankan).
- Alur testnet 46630 end-to-end.
- Penyebab sigma tidak valid: akhir pekan atau publisher berhenti.

## 7. Urutan yang disarankan

1. **D1** hari ini, karena hanya butuh deployer dan menutup risiko upgrade.
2. **D2 → D3 → D4**, berurutan.
3. **D5** dan **D7** paralel.
4. **D12** (demo mainnet) setelah semua di atas beres, sebelum web diumumkan untuk umum.
5. Sisanya (D6, D8–D11) bisa dikerjakan sambil jalan.
