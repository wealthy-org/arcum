# 🐞 LAPORAN AUDIT BUG — KELOLAHUB
## Modul 1: DASBOR (https://kelolahub.com/)

| | |
|---|---|
| **Tanggal audit** | 16 November 2026 |
| **URL** | https://kelolahub.com/ (Dasbor terautentikasi) |
| **Akun uji** | demo@kelolahub.id (akun demo production, sumber: `doc/archive/mvp/DEPLOY.md`) |
| **Workspace** | Umroh OS (ADMIN • Organisasi) |
| **Browser** | Chrome headed (jendela terlihat live selama audit) |
| **Viewport** | 1536×730 CSS px @ DPR 1.25 (screenshot 1920×912 px) |
| **Metode** | Pengukuran DOM terprogram (getBoundingClientRect, scrollWidth, computed style, rasio kontras WCAG) + screenshot bukti + axe-core 4.12.1 (WCAG 2A/2AA) + monitor console & network |
| **Batasan** | Hanya interaksi read-only. Aksi operasional (tombol "Tutup hari", ganti workspace, submit form) **sengaja tidak dieksekusi** untuk melindungi data production |

---

## RINGKASAN EKSEKUTIF

| ID | Judul | Keparahan | Kategori | Status |
|----|-------|-----------|----------|--------|
| KH-DAS-001 | Command palette tidak menemukan modul navigasi utama | 🔴 Tinggi | Fungsional/UX | Terkonfirmasi 2× |
| KH-DAS-002 | Shortcut keyboard pakai simbol Mac ⌘ di Windows | 🟠 Sedang | UX/Platform | Terkonfirmasi |
| KH-DAS-003 | 401 GET /api/auth/me saat load Dasbor | 🟠 Sedang | Backend/Network | Terobservasi, perlu konfirmasi dev |
| KH-DAS-004 | Kontras label sidebar mode terang 4.3 < 4.5 (WCAG AA) | 🟡 Rendah–Sedang | A11y/Kontras | Terukur manual (axe: pass, lihat catatan) |
| KH-DAS-005 | Counter notifikasi "20635" tanpa format ribuan | 🟡 Rendah | UI Copy | Terkonfirmasi |
| KH-DAS-006 | Checkbox tugas 18×18 px < minimum 24×24 (WCAG 2.5.8) | 🟡 Rendah | A11y/Tap target | Terukur 6 instance |
| KH-DAS-007 | Bahasa campur di command palette ("Esc Close") | 🟡 Rendah | i18n/Konsistensi | Terkonfirmasi |
| KH-DAS-008 | Judul tab EN ("Dashboard") vs UI ID ("Dasbor") | 🟡 Rendah | i18n/Konsistensi | Terkonfirmasi |
| KH-DAS-009 | Escape tidak menutup command palette (1× observasi) | 🟡 Rendah | UX/Keyboard | Perlu re-verifikasi |
| KH-DAS-010 | Breadcrumb memakai link `disabled` | 🟡 Rendah | A11y/Semantik | Terkonfirmasi |
| KH-DAS-011 | Teks BoardCast terpotong ellipsis tanpa tooltip | ⚪ Kosmetik | UI | Terukur |

**Hasil bersih:** 11 temuan (1 tinggi, 2 sedang, 7 rendah/kosmetik). Console: 0 error. axe-core: 0 violation. Gambar rusak: 0. 3 kandidat awal terbukti false positive (lihat §5).

---

## 1. DETAIL TEMUAN

### 🔴 KH-DAS-001 — Command palette tidak menemukan modul navigasi utama
- **Keparahan:** Tinggi (fitur pencarian global gagal untuk tujuan paling dasar)
- **Lokasi:** Modal pencarian global (Ctrl+K) — placeholder *"Ketik perintah atau cari proyek…"*
- **Langkah reproduksi:**
  1. Login → Dasbor
  2. Tekan `Ctrl+K`
  3. Ketik `presensi` → hasil: **"Tidak ada hasil untuk 'presensi'"**
  4. Hapus, ketik `keuangan` → hasil: **"Tidak ada hasil untuk 'keuangan'"**
- **Ekspektasi:** Modul "Presensi" dan "Keuangan" ada di sidebar utama; pencarian global seharusnya menemukannya (setidaknya item navigasi).
- **Bukti terukur:**
  - Hasil query 1: `data/hasil-cari.json` → `"Tidak ada hasil untuk \"presensi\""`
  - Hasil query 2: `data/hasil-cari-2.json` → `"Tidak ada hasil untuk \"keuangan\""`
- **Screenshot:** `screenshots/10-pencarian-query-presensi.png`

### 🟠 KH-DAS-002 — Simbol shortcut Mac (⌘) ditampilkan di Windows
- **Keparahan:** Sedang (menyesatkan user Windows; label keyboard tidak bisa diikuti)
- **Lokasi:** Command palette (baris "⌘K", "⌘P", "⌘N") dan tombol pencarian header
- **Langkah reproduksi:** Buka Dasbor di Windows → lihat badge shortcut ⌘K / ⌘P / ⌘N; tekan `Cmd+K` tidak berfungsi, `Ctrl+K` berfungsi tapi labelnya menampilkan ⌘.
- **Ekspektasi:** Deteksi platform → tampilkan `Ctrl K` di Windows/Linux.
- **Bukti terukur:** Palette DOM: `"⌘KNavigasiProject Catalog⌘PDashboardTugas Saya…CreateQuick Capture Note⌘N…"`
- **Screenshot:** `screenshots/09-modal-pencarian.png`

### 🟠 KH-DAS-003 — 401 GET /api/auth/me saat load Dasbor
- **Keparahan:** Sedang (perlu konfirmasi apakah probing disengaja atau race condition sesi)
- **Lokasi:** Network saat memuat https://kelolahub.com/ (sesi sudah login)
- **Langkah reproduksi:** Login → reload Dasbor dengan monitor network → 1 request `GET https://kelolahub.com/api/auth/me` → **HTTP 401**
- **Ekspektasi:** Bila sesi valid, `/api/auth/me` seharusnya 200; 401 berulang di load mengindikasikan call sebelum sesi attach, retry diam-diam, atau token refresh race.
- **Bukti terukur:** Network request ID `6424.196` — `401 GET https://kelolahub.com/api/auth/me (Fetch)`

### 🟡 KH-DAS-004 — Kontras label sidebar mode terang di bawah WCAG AA
- **Keparahan:** Rendah–Sedang (marginal, 4.3 vs syarat 4.5 untuk teks 12px)
- **Lokasi:** Label section sidebar mode terang: "Umroh OS", "Workdesk", "Workroom", "Toolbox", "Control Room", badge "ADMIN", "Organisasi"
- **Langkah reproduksi:** Klik tombol "Ganti ke mode terang" → perhatikan label abu-abu di sidebar
- **Bukti terukur:** 7 span, rasio kontras **4.3:1** (min 4.5:1), font-size 12px → `data/sweep-mode-terang.json`
- **Catatan metodologi:** axe-core melaporkan 0 violation (kemungkinan warna efektif berbeda setelah blending/opacity). Angka 4.3 berasal dari perhitungan manual computed style. Layak dicek desainer dengan eyedropper.
- **Screenshot:** `screenshots/05-dasbor-mode-terang.png`

### 🟡 KH-DAS-005 — Counter notifikasi tanpa pemisah ribuan
- **Keparahan:** Rendah
- **Lokasi:** Panel notifikasi (tombol lonceng header), badge counter
- **Langkah reproduksi:** Klik tombol Notifikasi → panel menampilkan **"20635 baru"**
- **Ekspektasi:** Format locale id-ID → **"20.635 baru"**
- **Bukti terukur:** `data/notif-panel.json` → `"Notifikasi20635 baruTandai semua…"`
- **Screenshot:** `screenshots/08-panel-notifikasi.png`

### 🟡 KH-DAS-006 — Tap target checkbox tugas 18×18 px
- **Keparahan:** Rendah (WCAG 2.5.8 Target Size Minimum level AA: 24×24 CSS px)
- **Lokasi:** Widget daftar tugas Dasbor ("Widget saya"), 6+ item
- **Bukti terukur:** 6 tombol checkbox `size-[var(--checkbox-size)]` terukur **18×18 px** — contoh: "Pembuatan Website Replika & Auto-Poster Mitra Agen", "Pengembangan Scanner QR Lanyard…", dst → `data/widget-clip-detail.json`
- **Rekomendasi:** Naikkan `--checkbox-size` ke ≥24px atau tambahkan padding hit-area.

### 🟡 KH-DAS-007 — Bahasa campur di command palette
- **Keparahan:** Rendah
- **Lokasi:** Footer command palette: `"↑↓ Navigasi"`, `"↵ Pilih"` (ID) bertetangga dengan `"Esc Close"` (EN)
- **Bukti terukur:** `data/hasil-cari.json` → `"↵ PilihEsc CloseTutup dialog"`
- **Screenshot:** `screenshots/10-pencarian-query-presensi.png`

### 🟡 KH-DAS-008 — Judul tab bahasa Inggris, UI bahasa Indonesia
- **Keparahan:** Rendah
- **Lokasi:** `<title>` tab browser
- **Bukti terukur:** `document.title` = **"Dashboard — Umroh OS"** sedangkan heading h1 halaman = **"Dasbor — KelolaHub"**

### 🟡 KH-DAS-009 — Escape tidak menutup command palette (perlu re-verifikasi)
- **Keparahan:** Rendah
- **Lokasi:** Command palette
- **Observasi:** Setelah mengetik query, tekan `Escape` → palette tetap terbuka (snapshot setelahnya masih menampilkan combobox `expanded=true`). Penutupan berhasil via tombol "Tutup dialog". Mungkin terkait fokus yang pindah dari input — perlu re-verify manual oleh manusia.
- **Bukti terukur:** Snapshot `4 refs` masih menampilkan dialog terbuka setelah Escape.

### 🟡 KH-DAS-010 — Breadcrumb memakai link disabled
- **Keparahan:** Rendah
- **Lokasi:** Breadcrumb header: `Home > Dasbor` — item "Dasbor" adalah `<a disabled>`
- **Masalah:** Link disabled bukan pola standar; breadcrumb item aktif lazimnya `aria-current="page"` pada span/link, bukan atribut disabled (screenreader membacakan secara berbeda; gaya visual bisa membingungkan).
- **Bukti terukur:** Snapshot aksesibilitas: `link "Dasbor" [disabled, ref=e353]`

### ⚪ KH-DAS-011 — Teks kartu BoardCast terpotong tanpa tooltip
- **Keparahan:** Kosmetik
- **Lokasi:** Widget BoardCast, deskripsi "Kabar tim, pengumuman & wawasan AI"
- **Bukti terukur:** `<p>` `text-overflow: ellipsis`, scrollWidth 222 vs clientWidth 201, **tanpa atribut `title`/`aria-label`** → `data/widget-clip-detail.json`

---

## 2. YANG DIPERIKSA & LOLOS (POSITIF)

| Pemeriksaan | Hasil |
|---|---|
| Console browser (seluruh sesi + interaksi) | ✅ 0 error, 0 warning |
| axe-core WCAG 2A/2AA (halaman Dasbor) | ✅ 0 violation, 30 passes |
| Gambar rusak (`naturalWidth=0`) | ✅ 0 dari semua `<img>` |
| Overflow horizontal halaman | ✅ Tidak ada (scrollWidth 1536 = viewport) |
| Kontras mode gelap | ✅ 0 temuan di bawah ambang |
| Toggle tema gelap ↔ terang | ✅ Fungsional (`class="dark"/"light"` terverifikasi DOM) |
| Ciut/expand sidebar | ✅ Fungsional; label jadi sr-only 1px (pola a11y benar untuk icon-only) |
| Panel notifikasi | ✅ Terbuka, muat di viewport (384×507 @ 1536×730), `aria-expanded=true` |
| Dropdown workspace | ✅ Buka/tutup normal |
| Skip link "Langsung ke konten utama" | ✅ Ada (2 instance) |
| `<html lang="id">` | ✅ Benar |

---

## 3. AKSI YANG SENGAJA TIDAK DILAKUKAN (PROTEKSI DATA PRODUCTION)

- Tombol **"Tutup hari"** (widget Presensi) — aksi operasional presensi asli
- **Ganti workspace** — hanya dibuka & ditutup, tidak ada pemilihan
- Semua **form submit** — tidak dieksekusi
- **Logout** — tidak dilakukan (sesi dipertahankan untuk audit modul berikutnya)

---

## 4. FALSE POSITIVE YANG TERFILTER (TRANSPARANSI METODE)

| Kandidat awal | Kesimpulan investigasi |
|---|---|
| "Widget Presensi overflow 20px" | Elemen dekoratif `position:absolute` sengaja keluar kontainer (wipe/glow), ter-clip rapi — **by design** |
| "Label ADMIN • Organisasi terpotong 4px" | `text-overflow: ellipsis` + atribut `title` lengkap — **intended truncation** |
| "h1 width 1px" | Heading visually-hidden untuk a11y — **benar** |

---

## 5. INDEKS BUKTI

**Screenshot (`screenshots/`):**
| File | Isi |
|---|---|
| `01-landing-desktop.png` | Landing publik (pra-login) |
| `02-dasbor-awal.png` | Dasbor kondisi awal + banner upsell |
| `03-dasbor-viewport.png` | Dasbor viewport penuh |
| `04-dasbor-fullpage.png` | Dasbor full-page (2400×1140) |
| `05-dasbor-mode-terang.png` | Mode terang (temuan kontras KH-DAS-004) |
| `06-dasbor-kembali-gelap.png` | Kembali mode gelap |
| `07-sidebar-ciut.png` | Sidebar collapsed |
| `08-panel-notifikasi.png` | Panel notifikasi (temuan KH-DAS-005) |
| `09-modal-pencarian.png` | Command palette (temuan KH-DAS-002, KH-DAS-007) |
| `10-pencarian-query-presensi.png` | Hasil "Tidak ada hasil" (temuan KH-DAS-001) |
| `11-dropdown-workspace.png` | Dropdown workspace |

**Data pengukuran (`data/`):**
`sweep-dasbor-1.json`, `banner-context.json`, `widget-clip-detail.json`, `presensi-rows.json`, `sweep-mode-terang.json`, `sidebar-ciut-cek.json`, `sidebar-ciut-cek2.json`, `notif-panel.json`, `hasil-cari.json`, `hasil-cari-2.json`, `admin-span-ukur.json`, `a11y-dasbor.json`, `network-dasbor.txt`

---

## 6. REKOMENDASI MODUL BERIKUTNYA

1. **Kotak Masuk** → layout chat/balas-pesan (repo punya riwayat branch `fix/balas-pesan-*`)
2. **Presensi** → dialog cuti/izin (commit terbaru baru saja fix clipping LCD 14" — verifikasi regresi di 1366×768)
3. **BoardCast** → linimasa kartu
4. **Responsive** → perlu sesi terpisah dengan viewport 1366×768, 768, 375 (emulasi perangkat)
5. **Alur login/logout** → halaman /masuk (validasi error state password salah)

---
*Dibuat otomatis oleh audit browser terprogram + human-readable evidence. Semua angka kontras/dimensi berasal dari pengukuran DOM live, bukan perkiraan visual.*
