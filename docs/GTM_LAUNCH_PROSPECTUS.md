# Arcum Protocol — Institutional Launch Prospectus & Go-To-Market (GTM) Playbook

> **Target Network:** Robinhood Chain Mainnet (`Chain ID: 4663`) — **BELUM DIDEPLOY, persetujuan pemilik diperlukan**  
> **Active Deployment:** Robinhood Chain Testnet (`Chain ID: 46630`) — kontrak live terverifikasi on-chain  
> **Settlement Asset (rencana):** USDG — alamat final diverifikasi ulang saat deploy  
> **Target Equities:** NVDA, TSLA, SPY, QQQ, AAPL  
> **Audit Status:** Internal — 66 automated tests + fork tests testnet lulus. **Belum ada audit keamanan eksternal.**  
> **Live Interface:** [https://arcum-f2tc.vercel.app](https://arcum-f2tc.vercel.app) | Produksi: [https://arcumpool.xyz](https://arcumpool.xyz)

---

## 1. Executive Summary

**Arcum** is the premier decentralized everlasting options protocol purpose-built for tokenized equities on the Robinhood Chain. By adapting continuous Euler-Cauchy ODE closed-form pricing to Cancun EVM smart contracts, Arcum eliminates the primary frictions of legacy options trading:

- **No Rollover Friction:** Options have no fixed expiration dates; positions can be held indefinitely.
- **Continuous In-Kind Holding Cost ($\text{Norm}_t$):** Daily and Weekly speeds govern decay smoothly without sudden theta collapse.
- **Zero Liquidation Risk for Buyers:** Long positions cannot be liquidated due to price spikes; risk is strictly capped at the initial USDG premium paid.
- **1-Click Shield Portfolio Downside Hedging:** 1-click execution protects synthetic stock tokens by automatically acquiring the optimal Weekly Put.
- **First-Class Autonomous AI Agent Tooling:** Model Context Protocol (MCP) integration with non-custodial on-chain policy enforcement (`AgentRouter.sol`).

---

## 2. Market Opportunity on Robinhood Chain

As the Robinhood Chain tokenizes major US equities (NVDA, TSLA, SPY, QQQ, AAPL), holders require decentralized hedging and non-linear yield instruments without leaving the chain. Arcum fills this institutional vacuum with:

1. **Retail Traders:** Asymmetric upside exposure with 10x-50x leverage and bounded loss.
2. **Equity Token Holders:** Instant portfolio insurance via 1-Click Shield.
3. **Passive Capital (Writer Pool):** Decentralized underwriting pool earning 80% protocol fees + funding yield with a conservative 72-hour withdrawal queue.
4. **Algorithmic Funds & AI Agents:** Non-custodial programmatic execution with ERC-4337 gas sponsorship.

---

## 3. Mainnet Deployment Status — BELUM DIDEPLOY (produksi)

**Per 20 November 2026, belum ada deploy produksi Arcum di Robinhood Chain Mainnet (4663).** Kalimat ini bukan disclaimer lama yang belum diperbarui — statusnya diverifikasi ulang hari ini.

Yang **sudah** benar dan terverifikasi on-chain di `4663` (bukan rencana):

- Token saham asli: NVDA `0xd0601CE157Db5bdC3162BbaC2a2C8aF5322D9EEC`.
- Feed Chainlink resmi untuk NVDA, AAPL, QQQ — `description()` masing-masing menyebut pasangannya (`"RHNVDA / USD"`, `"Robinhood AAPL / USD"`, `"Robinhood QQQ / USD"`), 8 desimal, round lengkap. Dibuktikan `contracts/test/fork/Mainnet4663.t.sol` (9 test) yang membaca rantai asli.
- Settlement USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`, 6 desimal.

Yang **belum**: kontrak Arcum versi produksi. Yang ada di `4663` hanya stack staging demo (`deployments/4663.json`, `MockUSDG` + mock PriceGuard), dan itu **bukan** rilis produksi.

- Seluruh kontrak aktif Arcum berada di **Testnet (46630)** — manifest: `deployments/46630.json`, bukti: `contracts/broadcast/DeployTestnet.s.sol/46630/`.
- Alamat yang sebelumnya ditampilkan di section ini adalah deployment **Lemniscate (upstream)** — bukan milik Arcum. Referensi arsip: `deployments/upstream-reference.json` (label: *NEVER used as Arcum operational keys or production target*). Jangan pernah mengarahkan pengguna untuk approve aset ke alamat tersebut.
- Manifest mainnet (`deployments/4663.json`) berstatus tombstone `BELUM_DIDEPLOY` dan akan diisi **dari hasil broadcast asli** (`run-latest.json`) saat deploy mainnet dilakukan.
- Rilis mainnet menunggu: keputusan owner (`docs/OWNER_DECISIONS.md`), key deploy yang belum pernah bocor, Safe yang bisa tanda tangan, dana gas, serta satu putaran audit keamanan eksternal sebelum protokol memegang dana publik. Rincian per kebutuhan + bukti: `docs/MAINNET_READINESS.md`.
- **Catatan daftar aset:** TSLA dan SPY **belum punya feed Chainlink di `4663`**, jadi kampanye yang menyebut TSLA di bawah tidak bisa jalan sampai feed-nya terbit. Daftar yang bisa diluncurkan sekarang: NVDA, AAPL, QQQ.

---

## 4. Go-To-Market (GTM) Campaign Sequences

### Sequence 1: Genesis Liquidity Seeding ($250k USDG)
- **Bootstrap Phase:** Genesis capital of $250,000 USDG deposited into the Writer Pool.
- **Underwriting Capacity:** Unlocks up to $87,500 USDG total open option liabilities and $20,000 USDG per single equity token.
- **Layer 1 Reserve Fund:** Initial $50,000 USDG buffer guarantees 100% absorption of market shocks up to -20% flash drop without LP NAV dilution.

### Sequence 2: 1-Click Shield Campaign for Tokenized Equity Holders
- Marketing campaign highlighting portfolio protection for NVDA and TSLA holders.
- 1-click user journey demonstrated with live browser video and PWA mobile terminal.

### Sequence 3: Autonomous AI Agent Hackathon ($50,000 USDG Grant Pool)
- Developers can configure Claude Desktop, Cursor, or autonomous Python agents in 2 minutes using `mcp-config.json`.
- Grants awarded for the most profitable non-custodial delta hedging and volatility arbitrage bots.

---

## 5. Security Invariants & Audit Guarantee

- **Invariant 1:** Non-Negative Time Value ($V(S) \ge \text{Payoff}(S)$ proven via stateful fuzzing).
- **Invariant 6:** Selling is NEVER blocked. If market sessions are `HALTED`, sells are queued to escrow tickets and fulfilled upon resumption.
- **Invariant 7:** Delegated AI agent keys hold ZERO custody. 100% of OptionTokens and proceeds are delivered strictly to the authorizing Owner address.
- **Privilege Map:** 48-Hour Timelock delay prevents instant administrative rug-pulls.

Official Handover Package archived at [`HANDOVER_PACKAGE.md`](../HANDOVER_PACKAGE.md).
