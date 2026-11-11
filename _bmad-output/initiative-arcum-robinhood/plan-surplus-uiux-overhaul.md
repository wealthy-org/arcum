---
title: 'Complete UI/UX Overhaul to Surplus.codes Editorial Architecture'
type: 'refactor'
ticket: ''
created: '2025-05-18'
status: 'in-progress'
baseline_revision: 'e658629f6368dca69476082260ff0d4e3ef48df8'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['docs/PRIVILEGE_MAP.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tampilan dashboard saat ini (`ss/image copy 3.png`) terlalu padat ("terlalu padet secara tampilan user kebingungan untuk preview") dengan 3 kolom berjejalan (sidebar, walkthrough banner raksasa, 5 kartu strike tebal, chart simulator, order slip, risk gauge). Manajer (Mas Azis) meminta rombak total mengadopsi 100% gaya visual dan layout lapang dari `surplus.codes` (`c:\laragon\www\kevin-work\wealthy-project\arcum\surplus.codes`).

**Approach:**
1. Rombak layout menjadi **Spacious Two-Column Counter Architecture (`Wqc0Rq_counter`)** khas Surplus:
   - Kolom Kiri: **The Order Slip** (Headline lapang, asset selector pills, input nominal units besar, strike selector dengan breathing room luas).
   - Kolom Kanan: **The Register Receipt** (Ledger dengan dot-leaders, Greeks breakdown, Web3 account badge, dan tactile Stamp Action Button).
2. Terapkan design tokens Surplus: Deep Pine/Midnight Ground (`#0d2a21` / `#0a121d`), Creamy Parchment Line (`#e6dfc8` / `#ede7d5`), hairline borders (`rgba(230, 223, 200, 0.2)`), dan stamp buttons dengan shadow tebal.
3. Rapikan secondary widgets (Walkthrough, What-If chart simulator, Pool risk gauge) ke dalam drawer/tab yang bersih agar tidak mengacaukan fokus layar utama.
4. Pertahankan 100% fungsionalitas on-chain (Wagmi writeContract, USDG approval, Faucet modal, Blockscout Explorer links).

## Boundaries & Constraints

**Always:**
- Pertahankan seluruh koneksi Web3, RainbowKit, Faucet, dan Blockscout explorer link yang sudah lulus audit.
- Sediakan breathing room dan whitespace yang lapang, bebas dari tumpukan kotak padat.
- Pastikan responsive di desktop maupun mobile.
- Validasi compile TypeScript (`tsc --noEmit`) dan Vite production build (`bun run build`).

**Never:**
- Jangan merusak kalkulasi matematika on-chain (Euler-Cauchy ODE, Greeks, Mark Price).
- Jangan memasukkan kembali banner walkthrough raksasa yang menutupi konten utama.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Trading View Preview | User membuka tab Trade | Layar lapang 2-kolom ala Surplus, teks jelas terbaca, tidak ada elemen bertabrakan | Fallback default ke NVDA $142.50 |
| Strike Selection | User klik baris strike | Baris aktif ditandai border line & dot leader, ringkasan harga di kanan update seketika | Nilai terikat ke quote engine |
| Order Buy Execution | User klik Stamp Button "BUY OPTION" | Modal konfirmasi terbuka, popup wallet muncul, link Blockscout explorer muncul saat sukses | Handle rejection tanpa crash |
| Faucet Claim | User klik "Faucet" di header | Modal claim 1,000 USDG terbuka | Handle wallet connection |

</frozen-after-approval>

## Code Map

- `web/src/index.css` -- Design tokens Surplus (`--ground`, `--line`, `--line-40`, `--hair`, stamp button styles, dot-leader styles).
- `web/src/components/Navbar.tsx` -- Surplus-style chrome header (logo, clean nav links, Faucet, Live/Demo, Connect button).
- `web/src/pages/DashboardPage.tsx` -- Rombak total ke Two-Column Counter Slip architecture (`Order Slip` di kiri, `Register Receipt` di kanan).
- `web/src/components/StockTickerBar.tsx` -- Minimalist ticker strip dengan style Surplus.
- `web/src/components/TestnetFaucetModal.tsx` -- Styling modal Faucet selaras Surplus parchment theme.

## Tasks & Acceptance

**Execution:**
- [ ] `web/src/index.css` -- add Surplus tokens & utility classes (dot-leaders, stamp buttons, parchment colors).
- [ ] `web/src/components/Navbar.tsx` -- refactor header to Surplus clean chrome aesthetic.
- [ ] `web/src/pages/DashboardPage.tsx` -- complete overhaul to Two-Column Counter Slip layout.
- [ ] Build & verification -- compile check and live browser visual verification.

## Verification

**Commands:**
- `cd web && bun run check` -- expected: TypeScript compiles with 0 errors
- `cd web && npx vite build` -- expected: Vite production bundle builds successfully
