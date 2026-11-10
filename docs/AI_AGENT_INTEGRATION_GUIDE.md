# Arcum Protocol — Autonomous AI Agent Integration Guide

> Technical guide for integrating Autonomous AI Agents with Arcum Everlasting Options Protocol on Robinhood Chain (`Chain ID: 4663`) via Model Context Protocol (MCP) and `AgentRouter.sol`.

---

## 1. Architectural Overview

Arcum provides a non-custodial, bounded trading infrastructure tailored for autonomous AI agents, algorithmic market makers, and automated portfolio hedgers.

```text
┌─────────────────────────────────┐
│     Autonomous AI Agent         │
│ (Claude / Cursor / LangChain)   │
└────────────────┬────────────────┘
                 │ stdio / JSON-RPC 2.0 (MCP)
                 ▼
┌─────────────────────────────────┐
│      Arcum MCP Tool Server      │ (app/src/mcp/server.ts)
│   • arcum_quote                 │
│   • arcum_chain                 │
│   • arcum_shield                │
│   • arcum_check_writer_pool     │
│   • arcum_check_policy          │
│   • arcum_execute_trade         │
└────────────────┬────────────────┘
                 │ ERC-4337 Sponsored UserOperation
                 ▼
┌─────────────────────────────────┐
│       AgentRouter.sol           │ (Robinhood Chain 4663)
│   • Non-Custodial Guarantee     │ (Recipient ≡ Owner always)
│   • Max-per-trade constraint    │
│   • 24-hour spending budget     │
│   • Whitelisted Stock Tokens    │
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│        ArcumEngine.sol          │ ──> USDG Settlement & OptionToken Mint
└─────────────────────────────────┘
```

---

## 2. Invariant Guarantees for Agent Operations

1. **Non-Custodial Enforcement (`Invariant 7`):**  
   The `AgentRouter` smart contract guarantees that regardless of which agent key signs the execution, **100% of minted OptionTokens and sale proceeds are delivered strictly to the authorizing Owner address**. The agent key holds zero custody over protocol funds.
2. **Slippage Bounds:**  
   Every trade execution payload includes an explicit `maxCostUsdg` limit computed from closed-form Euler-Cauchy ODE mark price + speed spread.
3. **Emergency Revocation:**  
   The wallet owner can revoke or modify an agent's policy on-chain at any time via `AgentRouter.revokePolicy(agentAddress)`.

---

## 3. Quickstart: Claude Desktop & Cursor MCP Setup

Add the following to your `claude_desktop_config.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "arcum-everlasting-options": {
      "command": "bun",
      "args": ["run", "app/src/mcp/server.ts"],
      "cwd": "/path/to/arcum",
      "env": {
        "CHAIN_ID": "4663",
        "RPC_URL": "https://rpc.mainnet.chain.robinhood.com",
        "USDG_ADDRESS": "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"
      }
    }
  }
}
```

---

## 4. MCP Tool Catalog

### `arcum_quote`
Calculates closed-form pricing, Greeks (Delta, Gamma), and daily norm decay for any stock and strike.
```json
{
  "stock": "NVDA",
  "strike": 145.0,
  "speed": "DAILY",
  "isCall": true,
  "units": 10
}
```

### `arcum_chain`
Returns active underlying spot prices, market session status (Regular, Extended, Closed, Halted), and listed strikes.
```json
{
  "stock": "TSLA"
}
```

### `arcum_shield`
Calculates optimal Weekly Down Put protection for an equity token balance.
```json
{
  "stock": "NVDA",
  "heldUnits": 100,
  "protectionPct": 5
}
```

### `arcum_check_writer_pool`
Returns Writer Pool solvency metrics, current NAV, capacity utilization, APR, and withdrawal queues.
```json
{
  "includeHistoricalApr": true
}
```

### `arcum_execute_trade`
Executes non-custodial option purchase on behalf of an owner through `AgentRouter.sol`.
```json
{
  "agentAddress": "0xAgent4663...",
  "ownerAddress": "0xYourOwnerAddress...",
  "stock": "NVDA",
  "strike": 145.0,
  "speed": "DAILY",
  "isCall": true,
  "units": 5,
  "maxCostUsdg": 150.0
}
```

---

## 5. End-to-End Test Execution

To verify agent interaction locally without real funds:

```bash
bun run scripts/agent_quickstart.ts
```

All agent executions are gas-sponsored via ERC-4337 Account Abstraction Paymaster on Robinhood Chain Mainnet (`Chain ID 4663`).
