# VolOracle Operational Architecture & Volatility Feed Runbook

## 1. Executive Summary

This document specifies the operational lifecycle, weekend status behavior, and automated publishing architecture of `VolOracle` (`0x3aB5Adf52ae9FEb20700868Eb6D5ee077F7D1Ed5`) on **Robinhood Chain Mainnet (Chain ID: 4663)**.

---

## 2. Weekend Status: Why `sigmaFor(...)` Returns `ok = false`

During weekend audits, `sigmaFor(stock)` returns `(sigmaBps, ok = false)`. This is **not a malfunction or downtime**, but an intentional, cryptographically enforced safety invariant.

### Contract Invariant (`VolOracle.sol` L111-L113)

```solidity
function sigmaFor(address stock) external view override returns (uint64 sigmaBps, bool ok) {
    VolConfig memory cfg = _configs[stock];
    VolReading memory r = _readings[stock];
    if (!cfg.enabled || r.sigmaBps == 0) return (0, false);

    sigmaBps = r.sigmaBps;
    ok = r.validUntil >= block.timestamp && r.sigmaBps >= cfg.minSigmaBps && r.sigmaBps <= cfg.maxSigmaBps;
}
```

### Expiration Math & TTL

- **Maximum Allowed Horizon (`cfg.maxAge`):** `7,200 seconds` (2 hours).
- **Default Publishing TTL:** `3,600 seconds` (1 hour).
- **Weekend Duration:** ~56 hours (Friday 16:00 ET to Monday 09:30 ET).

Because `maxAge` is capped at 2 hours, any volatility posted on Friday afternoon inevitably expires (`block.timestamp > validUntil`) within 1–2 hours. The oracle **refuses to price fresh option purchases on stale volatility while markets are closed**.

If `sigmaFor()` returned `ok = true` continuously over 56 hours without active market trading, the protocol would be vulnerable to pricing arbitrage against stale variance.

---

## 3. Publisher Identity & On-Chain Permissions

The canonical volatility publisher daemon runs with the isolated **Account 5** key:

| Role | Address | On-Chain Verification |
|---|---|---|
| **Contract** | `0x3aB5Adf52ae9FEb20700868Eb6D5ee077F7D1Ed5` | Deployed in `deployments/4663-production.json` |
| **Publisher** | `0x20572F72449e3Ac86F854bC92De06BC365F2351D` | `isPublisher(Account5) == true` (Tx: `0xcd0ba0... Block 119672225`) |
| **Settlement Assets** | NVDA, AAPL, QQQ | Configured on-chain with bounds `[500, 30000] bps` (5% to 300% vol) |

---

## 4. Automation & Scheduled Daemons

Mainnet volatility updates are driven by:
1. **Script:** `vol-engine/publish_once.py`
2. **Scheduler Entry Point:** `vol-engine/ops/run-vol-mainnet.cmd`
3. **RPC Relay:** `http://127.0.0.1:8548` (bypassing expired public SSL cert)

### Execution Command

```powershell
cd vol-engine
$env:VOL_ENGINE_RPC="http://127.0.0.1:8548"
$env:VOL_ORACLE_ADDRESS="0x3aB5Adf52ae9FEb20700868Eb6D5ee077F7D1Ed5"
$env:RH_TESTNET_RPC="http://127.0.0.1:8548"
python publish_once.py
```

### Market Hours Lifecycle

- **Pre-Market (04:00 – 09:30 ET):** Pipeline ingests overnight equity movements, generates daily variance estimates, and posts with validUntil matching the session window.
- **Regular Hours (09:30 – 16:00 ET):** Cron triggers every 30–60 minutes, ensuring `validUntil >= block.timestamp` continuously. `sigmaFor()` reports `ok = true`.
- **Weekend / Holiday:** Publisher sleeps or posts during market opening preparation. Sells remain non-blocking; buys require live market session.
