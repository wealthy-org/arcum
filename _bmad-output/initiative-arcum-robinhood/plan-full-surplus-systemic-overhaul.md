---
title: 'Full Systemic Overhaul of All Pages to Surplus.codes Architecture'
type: 'refactor'
ticket: ''
created: '2025-05-18'
status: 'in-progress'
baseline_revision: 'c2997cf31a89c8a8ba01b7cc1c33b7be58b73ad6'
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

**Problem:** Halaman depan (`Home`) sudah menggunakan kanvas Spirograph Surplus, namun halaman-halaman dalam (`Trade`, `Docs`, `Contracts`, `Pool`, dsb.) masih menampilkan struktur layout lama (navbar generic, card bertumpuk, tombol rounded cyan), sehingga terjadi ketidaksesuaian desain yang mencolok.

**Approach:** Lakukan perombakan sistemik pada seluruh halaman dalam:
1. Ganti navbar global dengan Surplus Chrome Header (`a1ciZa_chrome`) lengkap dengan breadcrumb, navigasi Places, tombol Faucet, dan Connect Wallet stamp button.
2. Terapkan arsitektur Counter Screen (`Wqc0Rq_counter`) pada halaman Trading / Dashboard.
3. Terapkan arsitektur Prospectus (`i2iP7q_index`) pada halaman Docs.
4. Terapkan arsitektur Ledger Register (`_4VSiGW_ledger`) pada halaman Verified Contracts.
5. Pertahankan 100% logika dan fungsionalitas smart contract, Web3 wallet connect, Faucet, dan Blockscout explorer links.

## Boundaries & Constraints

**Always:**
- Pertahankan seluruh logika on-chain (Wagmi writeContract, USDG approval, Faucet, Blockscout links).
- Gunakan skema warna Surplus: Deep Pine `#0d2a21` / Warm Parchment `#e6dfc8`.
- Validasi compile TypeScript (`tsc --noEmit`) dan Vite production build (`bun run build`).

**Never:**
- Jangan gunakan kembali komponen bootstrap card atau navbar lama.

</frozen-after-approval>

## Code Map

- `web/src/index.css` -- Surplus global styles, CSS variables, and layout utility classes.
- `web/src/components/Navbar.tsx` -- Surplus Chrome Header (`a1ciZa_chrome`) with breadcrumb and stamp buttons.
- `web/src/pages/DashboardPage.tsx` -- Surplus Counter Screen (`Wqc0Rq_counter`) for Options Trading.
- `web/src/pages/DocsPage.tsx` -- Surplus Prospectus (`i2iP7q_index`) for Documentation.
- `web/src/pages/ContractsPage.tsx` -- Surplus Ledger (`_4VSiGW_ledger`) for Verified Contracts.
- `web/src/pages/ExitPage.tsx` -- Surplus Certificate style for Emergency Exit.

## Verification

**Commands:**
- `cd web && bun run check` -- expected: TypeScript compiles with 0 errors
- `cd web && npx vite build` -- expected: Vite production bundle builds successfully
