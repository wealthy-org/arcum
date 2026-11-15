# TAHAP 0 — CLEANUP LOG (14 November 2026)

**Eksekutor:** Tim BMAD (eksekusi nyata, oleh agen)
**Mandat:** Owner, via persetujuan percakapan: *"Oke Silahkan Ekskeusi ... dengan sangat matang dan Maksimal. dan JUJURRRR"*
**Metode verifikasi:** dua putaran audit on-chain (RPC testnet 46630 + explorer mainnet `robinhoodchain.blockscout.com`) sebelum mengubah file.

---

## Bukti dasar (yang memicu cleanup)

1. **Mainnet 4663: 0 kontrak Arcum.** Explorer mainnet resmi menunjukkan `0x1C1f41721fe49c8dee117B17De1006817C974687` = **ERC1967Proxy dengan implementation `LemniscateEngine`** (milik upstream, bukan Arcum).
2. **Testnet 46630: REAL.** chainId `0xb626` ✅, blockNumber > deployBlock ✅, kode ArcumEngine/WriterPoolProxy/AgentRouter ada ✅, receipt deploy AgentRouter `0xac0996dc...` cocok manifest ✅.
3. Laporan dry-run & canary = **simulasi Anvil lokal**, dengan klaim approval palsu ("BMAD Guild sign-off", "READY FOR PRODUCTION FUNDS").

## Perubahan file (9 file)

| # | File | Sebelum | Sesudah |
|---|---|---|---|
| 1 | `deployments/4663.json` | Alamat Lemniscate tanpa label ("Canonical Mainnet Manifest") | Tombstone `BELUM_DIDEPLOY`, semua alamat di-nol-kan, catatan larangan pakai alamat upstream |
| 2 | `docs/GTM_LAUNCH_PROSPECTUS.md` §3 | "Verified Mainnet Deployment Identifiers" — 7 alamat Lemniscate dijual sebagai kontrak Arcum | Status `BELUM DIDEPLOY` + label eksplisit alamat = Lemniscate (arsip: `upstream-reference.json`) |
| 3 | `docs/GTM_LAUNCH_PROSPECTUS.md` header | "Audit: Verified by BMAD Guild Grade A+" (klaim audit palsu) | "Internal — 66 tests + fork tests. Belum ada audit eksternal" |
| 4 | `HANDOVER_PACKAGE.md` | "Canonical Mainnet Deployment Manifest", "ready for production deployment" | Tombstone + status jujur: mainnet belum deploy, tunggu owner + audit |
| 5 | `deployments/mainnet_dry_run_report.json` | `APPROVED` / `READY FOR STAGING AND PRODUCTION FUNDS` | `SIMULATION_ONLY_NOT_A_DEPLOYMENT` + disclaimer |
| 6 | `deployments/canary_staging_report.json` | `CANARY_STAGING_PASSED_100_PERCENT` + sign-off persona | `CANARY_SIMULATION_PASSED_NOT_A_DEPLOYMENT` + disclaimer (kontrak yang dicek = Lemniscate) |
| 7 | `scripts/mainnet_dry_run.py` | Generator menulis verdict palsu | Verdict + disclaimer jujur (tahan regenerasi) |
| 8 | `scripts/canary_mainnet_fork.py` | Idem | Idem |
| 9 | `reports/QA_AUDIT_REPORT.md` + `docs/ECONOMIC_WHITEPAPER.md` | "PRODUCTION READY & VERIFIED", "formally certifies", target mainnet ditulis sbg fakta | Kualifikasi: QA internal, bukan audit eksternal, bukan bukti deploy |

## Yang sengaja TIDAK diubah

- `deployments/upstream-reference.json`, `BASELINE.md`, `PARAMETERS.md`, `ARCUM_ROBINHOOD_DEV_BRIEF.md`, `REVISI_FITUR_TESTNET.md` — alamat Lemniscate di sana sudah berlabel referensi/arsip (benar).
- `web/src/` — DocsPage sudah jujur: *"Mainnet Arcum belum live... Tidak ada kontrak aktif di Mainnet (4663)"*; `wagmi.ts` sudah lock testnet.
- `reports/explorer-mainnet-check.json` — artefak bukti audit, alamat muncul sebagai data investigasi.
- `deployments/46630.json` — manifest testnet AKTIF, terverifikasi on-chain, tidak disentuh.
- `docs/OWNER_DECISIONS.md` — milik owner; tidak ada keputusan yang gua-hantam-sendiri.

## Status pasca-cleanup (verifikasi otomatis)

- 5 JSON manifest/report: valid parse ✅
- Grep `READY FOR STAGING AND PRODUCTION FUNDS`, `CANARY_STAGING_PASSED_100_PERCENT`, `BMAD Guild`: **0 hasil** ✅
- Alamat `0x1C1f...` / `0x67fF...` hanya tersisa di file berlabel referensi/arsip/bukti ✅

## Belum tuntas (jujur, out-of-scope tahap ini)

- **Item #16 bukti E2E web** (rekaman layar tombol web E1–E10 saat bursa NYSE aktif) masih 🟡 terbuka di `docs/TESTNET_E2E_EVIDENCE.md` — jangan klaim "100% tuntas" sebelum ada rekamannya.
- **Audit keamanan eksternal belum dilakukan** — rekomendasi tim sebelum protokol pegang dana publik.
- **Keputusan owner** (go/no-go mainnet, sumber modal $250.000 USDG, parameter genesis) masih pending di `docs/OWNER_DECISIONS.md`.
- Verifikasi RPC **mainnet** langsung masih terhalang jaringan (blokir ISP); saat jaringan terbuka, jalankan `python scripts/dump_onchain.py` (atau setara) untuk snapshot mainnet.
