---
title: 'Real Web3 Wallet Connection & Robinhood Chain Integration'
type: 'feature'
ticket: ''
created: '2025-05-18'
status: 'built'
baseline_revision: '17be810dc6d399fd481ac608fc9036641f3ed83e'
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

**Problem:** Tombol "Connect Wallet" di `@arcum/web` saat ini masih berupa simulasi/mockup React state lokal dengan alamat statis dummy `0x71C8...a49B`, tanpa interaksi nyata ke Web3 provider (MetaMask, Rabby, Browser Wallets) dan Robinhood Chain (ID 4663).

**Approach:** Pasang dan konfigurasikan `@rainbow-me/rainbowkit`, `wagmi`, `viem`, dan `@tanstack/react-query` untuk Robinhood Chain (ID 4663), sediakan toggle dual-mode yang mulus ("Live Web3 Wallet" vs "Demo Simulation Mode" dengan saldo USDG test), dan hubungkan state akun aktif ke UI dashboard dan navbar.

## Boundaries & Constraints

**Always:**
- Pertahankan estetika Doppelrand / Bloomberg dark terminal gold theme yang sudah dirancang rapi di frontend.
- Dukung Robinhood Chain (ID 4663, RPC `https://rpc.mainnet.chain.robinhood.com`) sebagai chain utama.
- Sediakan fallback Demo / Simulation Mode agar user tanpa wallet tetap dapat mengeksplorasi kalkulator Greeks, What-If simulator, dan alur trade tanpa error.
- Validasi compile TypeScript (`tsc --noEmit`) dan Vite production build (`bun run build`).

**Never:**
- Jangan merusak fungsionalitas 8 tab dashboard yang sudah berjalan.
- Jangan hardcode private key atau secret apapun di client-side code.
- Jangan menghapus kalkulasi visual matematika yang sudah presisi.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Connect via MetaMask / Rabby | User klik "Connect Wallet" dan pilih wallet | Prompt wallet muncul, setelah approve address aktif & ENS/short address muncul di navbar | Tangkap user rejection tanpa crash aplikasi |
| Wrong Network Detected | User terhubung ke network selain 4663 | Tombol menampilkan status "Switch to Robinhood Chain" | Panggil switchChain({ chainId: 4663 }) |
| Demo Mode Toggled | User mengaktifkan Demo Mode toggle | UI beralih ke saldo simulasi $25,000 USDG dengan badge visual jelas | State lokal terisolasi dari live wallet |
| Disconnect Wallet | User klik profil wallet lalu disconnect | State kembali ke disconnected / prompt connect | Bersihkan session state |

</frozen-after-approval>

## Code Map

- `web/package.json` -- dependensi Web3 (`wagmi`, `viem`, `@rainbow-me/rainbowkit`, `@tanstack/react-query`).
- `web/src/config/wagmi.ts` -- definisi kustom Robinhood Chain (4663), RPC fallback, dan konfigurasi Wagmi Client.
- `web/src/components/Web3Provider.tsx` -- Provider wrapper untuk WagmiProvider, QueryClientProvider, dan RainbowKitProvider (dark theme kustom).
- `web/src/main.tsx` -- Integrasi Web3Provider ke root rendering React.
- `web/src/components/Navbar.tsx` -- Penggantian tombol dummy dengan RainbowKit Custom Connect Button & indikator Network + Demo Toggle.
- `web/src/App.tsx` -- Sinkronisasi state wallet & mode demo ke context aplikasi.
- `web/src/pages/DashboardPage.tsx` -- Tampilan address akun aktif, balance detection, dan eksekusi order adaptif (Web3 vs Demo).

## Tasks & Acceptance

**Execution:**
- [ ] `web/src/config/wagmi.ts` -- create Wagmi config -- definisi Robinhood Chain (4663) dan RainbowKit default config.
- [ ] `web/src/components/Web3Provider.tsx` -- create Web3Provider -- bungkus aplikasi dengan Wagmi, TanStack Query, dan RainbowKit dark theme.
- [ ] `web/src/main.tsx` -- update main.tsx -- render App di dalam Web3Provider dan import RainbowKit CSS.
- [ ] `web/src/components/Navbar.tsx` -- refactor Navbar -- pasang ConnectButton custom styling Bloomberg dark-gold dan Demo Mode toggle.
- [ ] `web/src/App.tsx` & `web/src/pages/DashboardPage.tsx` -- bind account state -- sinkronkan address user dan saldo USDG antara Web3 dan demo mode.

**Acceptance Criteria:**
- Given browser dengan ekstensi Web3 (MetaMask/Rabby), when user menekan "Connect", then modal koneksi wallet RainbowKit terbuka.
- Given wallet terhubung pada chain selain 4663, when terdeteksi, then muncul opsi switch ke Robinhood Chain.
- Given user dalam Demo Mode, when transaksi disimulasikan, then sistem tetap mengizinkan simulasi tanpa error Web3.
- Given build pipeline, when `cd web && bun run build`, then build selesai tanpa error TypeScript (`✓ built in ...`).

## Implementation Notes

## Plan Change Log

## Review Triage Log

| Lens | Verdict | Evidence |
|------|---------|----------|
| quick | pass | 4/4 ACs verified: RainbowKit ConnectButton.Custom integration, Chain 4663 configuration, Demo simulator toggle, and clean build. |

## Design Notes

Gunakan `ConnectButton.Custom` dari RainbowKit agar tombol koneksi wallet mempertahankan style typography tabular mono, border halus gold-500/30, dan status online indicator berwarna emerald-400 yang selaras dengan tema Arcum.

## Verification

**Commands:**
- `cd web && bun run check` -- expected: TypeScript compiles with zero diagnostics
- `cd web && bun run build` -- expected: Vite production bundle generated successfully
