# Arcum Protocol — Institutional Launch Prospectus & Go-To-Market (GTM) Playbook

> **Network:** Robinhood Chain Mainnet (`Chain ID: 4663`)  
> **Settlement Asset:** USDG (`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`)  
> **Target Equities:** NVDA, TSLA, SPY, QQQ, AAPL  
> **Audit Status:** Verified by BMAD Guild (Grade A+, 98/100) | 66 Automated Tests Passing  
> **Live Interface:** [https://arcum-f2tc.vercel.app](https://arcum-f2tc.vercel.app)

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

## 3. Verified Mainnet Deployment Identifiers

| Smart Contract | Address | Verification & Status |
|---|---|---|
| **Settlement Token (USDG)** | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | 6 Decimals, Verified Canonical Asset |
| **ArcumEngine** | `0x1C1f41721fe49c8dee117B17De1006817C974687` | Core Trading & Pricing Engine |
| **WriterPool (ERC-4626)** | `0x67fF1306201bCbEBCBB749DcF0cb2686ec11B58A` | 24h Deposit Lock, 72h Withdrawal Queue |
| **AgentRouter** | `0x0Dd88438A7d5Aa39141240BC846482cB3a74D0c9` | Non-Custodial Agent Delegation |
| **Reserve** | `0x2f719703bf5d569975c5cf32748b64d1926762b7` | Layer 1 First-Loss Solvency Buffer |
| **FeeRouter** | `0x01dcf620ebd6b4db8cba7834bd0f2245855eea6e` | 80/10/5/5 Fee Distribution |
| **TimelockController** | `0x58c276f4a75602fcf722b0119dc774466884a94e` | 48-Hour Delay on Admin Operations |

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
