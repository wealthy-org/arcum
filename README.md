# Arcum — Everlasting Options Protocol on Robinhood Chain

> Institutional Everlasting Options protocol built for Robinhood Chain Stock Tokens, settled in USDG.

[![Vercel Live Production](https://img.shields.io/badge/Vercel-Live%20Production-success?style=flat-square&logo=vercel)](https://arcum-f2tc.vercel.app)
[![Foundry Tests](https://img.shields.io/badge/Foundry-23%20Passed-10B981?style=flat-square&logo=solidity)](./contracts)
[![Bun Services](https://img.shields.io/badge/Bun-20%20Passed-10B981?style=flat-square&logo=bun)](./app)
[![Python Vol Engine](https://img.shields.io/badge/Pytest-5%20Passed-10B981?style=flat-square&logo=python)](./vol-engine)
[![Network](https://img.shields.io/badge/Network-Robinhood%20Chain%20(4663)-D4AF37?style=flat-square)](https://robinhoodchain.blockscout.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)

---

## 🌐 Live Production Deployment
- **Web App & PWA:** [https://arcum-f2tc.vercel.app](https://arcum-f2tc.vercel.app)
- **Live Health API:** [https://arcum-f2tc.vercel.app/v1/health](https://arcum-f2tc.vercel.app/v1/health)
- **Live Equities Feed:** [https://arcum-f2tc.vercel.app/v1/stocks](https://arcum-f2tc.vercel.app/v1/stocks)
- **Live Writer Pool API:** [https://arcum-f2tc.vercel.app/v1/pool](https://arcum-f2tc.vercel.app/v1/pool)
- **Euler-Cauchy ODE Solver:** [https://arcum-f2tc.vercel.app/api/vol/?spot=142.5&strike=140&iv_bps=5200](https://arcum-f2tc.vercel.app/api/vol/?spot=142.5&strike=140&iv_bps=5200)

---

---

## 1. Overview

**Arcum** is an everlasting options protocol designed for tokenized equities on Robinhood Chain (Chain ID `4663`). It provides non-linear Call (Up) and Put (Down) exposures without fixed expiration dates, eliminating rollover friction and liquidation risks.

### Core Pillars
1. **Everlasting Options Trading:** Up (Call) and Down (Put) options referencing Stock Tokens (NVDA, TSLA, SPY, QQQ, AAPL). Settled in USDG with bounded upfront costs and continuous in-kind holding decay ($\text{Norm}_t$).
2. **Automated Shield Protection:** 1-click portfolio downside hedging. Shield inspects synthetic equity holdings in user wallets and acquires the optimal registered Weekly Put option.
3. **USDG Writer Pool:** Decentralized underwriting pool capturing 80% protocol fee distribution + funding yield, protected by conservative liability valuation bounds, a 24-hour deposit lock, and a 72-hour asynchronous withdrawal notice queue.
4. **Agent Router & MCP Integration:** On-chain bounded execution router allowing autonomous AI agents (via Model Context Protocol) to trade within owner-defined budget limits, expiry dates, and whitelisted assets.

---

## 2. Architecture & Tech Stack

```text
arcum/
├── contracts/        Solidity 0.8.28, Foundry 1.8.7, Cancun EVM, OpenZeppelin v5.1.0
├── app/              Bun 1.4.2, TypeScript 5.9, Viem, Zod, Indexer, Keeper, Hedger, MCP
├── vol-engine/       Python 3.13, uv 0.12.9, numpy, scipy, eth-account EIP-712 signer
├── web/              React 18, Vite 6, TailwindCSS 3, Lucide Icons, 100% Visual Parity
├── deployments/      4663.json (Mainnet Manifest) & local.json (Anvil Manifest)
└── docs/             PRIVILEGE_MAP.md, RUNBOOKS.md, LATER_PHASE_ACTIVATION.md, BASELINE.md
```

---

## 3. Network & Deployment Identifiers

| Parameter | Mainnet Value | Description |
|---|---|---|
| **Chain ID** | `4663` | Robinhood Chain Mainnet |
| **RPC Endpoint** | `https://rpc.mainnet.chain.robinhood.com` | Official Network RPC |
| **Block Explorer** | `https://robinhoodchain.blockscout.com` | Blockscout Explorer |
| **Settlement Token (USDG)** | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | 6 Decimals |
| **Base Protocol Fee** | `3 bps` (`0.03%`) | Charged on executed trade value |
| **Timelock Controller** | `0x58c276f4a75602fcf722b0119dc774466884a94e` | 48-Hour delay on admin upgrades |

---

## 4. Quickstart & Local Verification

### Prerequisites
- [Foundry](https://getfoundry.sh/) (`forge`, `anvil`, `cast`)
- [Bun](https://bun.sh/) (`>=1.4.2`)
- [Python & uv](https://docs.astral.sh/uv/) (`>=3.11`)
- [Docker](https://www.docker.com/) (Optional for containerized run)

### Running Automated Test Suites

```bash
# 1. Test Smart Contracts (23 passed)
cd contracts && forge test

# 2. Test Backend Services, Indexer & Pricing Math (20 passed)
cd ../app && bun test && bun run typecheck

# 3. Test Python Volatility Engine & EIP-712 Signer (5 passed)
cd ../vol-engine && uv run python -m pytest

# 4. Verify Mathematical Parity (0.00e+00 diff)
cd .. && uv run python scripts/differential_test.py

# 5. Run Live End-to-End Blockchain Acceptance Demo
uv run python scripts/full_acceptance_demo.py
```

### Running with Docker Compose

Deploy the entire production stack (Web + API + Volatility Engine) with one command:

```bash
docker compose up -d --build
```
- **Web Trading Dashboard:** `http://localhost:3001`
- **Backend API & Telemetry:** `http://localhost:3002/v1/health`

---

## 5. Security & Invariant Guarantees

- **Non-Negative Time Value:** Proven via stateful fuzzing ($V(S) \ge \text{Payoff}(S)$ for all market states).
- **Selling Is Never Blocked:** Administrative pauses cannot lock user exits. Sells during halted sessions automatically queue into escrowed tickets.
- **Key Isolation:** Keeper, Hedger, and Volatility Signer utilize separate non-custodial operational keypairs.
- **48-Hour Admin Timelock:** Upgrades and parameter modifications require 48 hours queue notice.

See [`contracts/INVARIANTS.md`](./contracts/INVARIANTS.md) and [`docs/PRIVILEGE_MAP.md`](./docs/PRIVILEGE_MAP.md) for detailed proofs.

---

## 6. Handover & Audit Log

The complete audit trail, baseline analysis, and operational runbooks are archived:
- [`Task Breakdown Record.md`](./Task%20Breakdown%20Record.md) — BMAD-compliant append-only progress log.
- [`HANDOVER_PACKAGE.md`](./HANDOVER_PACKAGE.md) — Official handover sign-off and 12 acceptance demonstration proofs.
- [`docs/RUNBOOKS.md`](./docs/RUNBOOKS.md) — 8 emergency response procedures.

---

## 7. License

Licensed under the [MIT License](./LICENSE). Attribution and original source notices preserved in compliance with upstream reference baseline (`commit: 1d434a3a3186cbb0feed172dec3a872cfa610e09`).
