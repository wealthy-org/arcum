---
title: 'On-Chain Transaction Execution & Testnet Blockscout Verification'
type: 'feature'
ticket: ''
created: '2025-05-18'
status: 'in-progress'
baseline_revision: 'bd7e099792cd36860a9152365d0a7126a34a9be9'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['docs/PRIVILEGE_MAP.md', 'deployments/4663.json']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ketika user mengklik "Approve USDG & Execute Buy" di Dashboard, transaksi saat ini masih berjalan di memori lokal (stepper setTimeout), sehingga belum memunculkan prompt konfirmasi gas di wallet (MetaMask/Rabby) dan belum menghasilkan transaction hash nyata yang tercatat di block explorer Robinhood Testnet/Mainnet.

**Approach:** Sambungkan eksekusi order ke smart contract on-chain menggunakan Wagmi `useWriteContract` dan `useWaitForTransactionReceipt`:
1. Approval token USDG on-chain (`IERC20.approve(ArcumEngine, amount)`).
2. Pembelian opsi on-chain (`ArcumEngine.buy(seriesId, units, maxCost, deadline, recipient)`).
3. Penyediaan tombol 1-Click Faucet USDG Testnet (`Claim 1,000 Test USDG`) untuk memfasilitasi tester yang belum memiliki saldo USDG on-chain.
4. Menampilkan link transaksi langsung ke Blockscout Explorer (`https://robinhoodchain.blockscout.com/tx/{txHash}`) setelah transaksi berhasil terkonfirmasi di blok.

## Boundaries & Constraints

**Always:**
- Pertahankan dukungan dual-mode (Demo Mode tetap jalan cepat di memori untuk demo tanpa wallet; Live Web3 Mode mengeksekusi on-chain).
- Tangani error penolakan user (User rejected transaction in wallet) secara elegan tanpa merusak UI.
- Validasi compile TypeScript (`tsc --noEmit`) dan Vite production build (`bun run build`).

**Never:**
- Jangan hardcode private key atau secret apapun di client-side code.
- Jangan memblokir user Demo Mode dari mencoba kalkulasi opsi.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Live Web3 Buy Option | User connect MetaMask & klik Approve/Buy | MetaMask popup meminta konfirmasi transaksi, setelah approved mengirim tx buy(), lalu menampilkan link Blockscout Explorer dengan Tx Hash | Tampilkan alert jika user me-reject transaksi |
| Live Web3 Faucet Claim | User klik "Claim 1,000 Test USDG" | Saldo bertambah & tercatat tx on-chain | Notifikasi sukses / error jika RPC gagal |
| Demo Mode Buy Option | User dalam Demo Mode klik Buy Option | Simulasi instan 1 detik tanpa memicu MetaMask prompt | Posisi lokal bertambah di tabel Positions |

</frozen-after-approval>

## Code Map

- `web/src/contracts/abis.ts` -- ABI typed untuk IERC20 (approve, allowance, balanceOf, mint) dan ArcumEngine (buy, quote).
- `web/src/config/wagmi.ts` -- Helper explorer URL (`getExplorerTxUrl`).
- `web/src/hooks/useOnChainTrade.ts` -- Custom hook mengelola status approval USDG, writeContract buy(), waiting receipt, dan capturing real tx hash.
- `web/src/components/TestnetFaucetModal.tsx` -- Modal / widget Faucet untuk claim 1,000 USDG testnet.
- `web/src/pages/DashboardPage.tsx` -- Integrasi hook ke order execution modal & link Blockscout Explorer.
- `web/src/components/Navbar.tsx` -- Akses cepat ke Faucet USDG di navbar.

## Tasks & Acceptance

**Execution:**
- [ ] `web/src/contracts/abis.ts` -- create ABIs -- IERC20 dan ArcumEngine typed interface.
- [ ] `web/src/hooks/useOnChainTrade.ts` -- create hook -- on-chain approval, buy execution, dan receipt tracking.
- [ ] `web/src/components/TestnetFaucetModal.tsx` -- create faucet -- modal faucet USDG testnet dengan explorer link.
- [ ] `web/src/pages/DashboardPage.tsx` -- wire on-chain -- sambungkan modal buy ke on-chain hook dengan fallback demo mode.
- [ ] `web/src/components/Navbar.tsx` -- add faucet button -- sediakan tombol Faucet di header untuk kemudahan testing.

## Verification

**Commands:**
- `cd web && bun run check` -- expected: TypeScript compiles with 0 errors
- `cd web && bun run build` -- expected: Vite production bundle builds successfully
