# Arcum — Protocol Privilege & Security Map (`PRIVILEGE_MAP.md`)

**Date:** 9 November 2026  
**Target Network:** Robinhood Chain Mainnet (`4663`)

---

## 1. Role Hierarchy & Timelock Enforcement

```text
[ 48-Hour Timelock Controller (0x58c2...a94e) ]
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[ ArcumEngine Admin ]       [ WriterPool Admin ]
(Upgradeable Proxies)       (Upgrades & Global Caps)

[ Isolated Operational Keypairs (No Upgrades / No Treasury Access) ]
        ├── Keeper Key     ──> accrue(id) / accrueMany(ids) on the engine (tidak punya role on-chain;
        │                      storeAccrual() hanya bisa dipanggil engine, bukan keeper)
        ├── Hedger Key     ──> swapExactIn() (Whitelisted Uniswap Pools Only)
        └── Publisher Key  ──> VolOracle.post() / postMany() (allowlist isPublisher, bukan EIP-712)
```

---

## 2. Granular Role & Access Control Matrix

| Role | Controlled By | Timelock Delay | Granted Capabilities | Prohibited Actions |
|---|---|---|---|---|
| **Timelock Owner / Admin** | Cold Multisig (`0x58c2...a94e`) | **48 Hours** | Upgrade proxy implementations, change fee waterfall, whitelist new stock tokens, adjust risk caps | Cannot withdraw user funds directly; cannot bypass 48h delay |
| **Guardian** | Emergency Multi-Party EOA | **0 Hours (Instant)** | Pause new option buys (`buysPaused`), pause pool deposits on critical volatility surge | **CANNOT block option sells**; cannot touch user funds |
| **Keeper** | Autonomous Worker Daemon | None (Operational) | Call `accrue(id)` / `accrueMany(ids)` on the engine to record funding norm decay, and `fillQueued(ticket)` for mature tickets (`storeAccrual()` sendiri hanya bisa dipanggil engine, jadi keeper tidak bisa memalsukan norm) | Cannot spend pool cash; cannot alter series parameters |
| **Hedger** | Automated Delta Rebalance Worker | None (Operational) | Execute exact bounded spot rebalances on whitelisted Uniswap routes | **Cannot transfer USDG out of pool**; cannot exceed 100 bps slippage |
| **Vol Publisher** | Dedicated hot key, allowlisted on-chain | None (Cryptographic) | Call `VolOracle.post()` / `postMany()` with `VolReading{price, sigma, ...}`; hanya bisa kalau `isPublisher(msg.sender)` true. **Tidak pakai EIP-712**, tidak ada signature atau nonce | Cannot change `VolConfig`; cannot spend pool cash; tidak bisa memposting di luar band `MIN_SIGMA_BPS`/`MAX_SIGMA_BPS` |
| **Agent Key** | User-Delegated AI / MCP Agent | None (Bounded) | Execute `buyFor`, `sellFor`, `shieldFor` on behalf of owner within on-chain policy | **Cannot change recipient**; cannot exceed budget; cannot trade non-whitelisted stocks |

---

## 3. Key Isolation & Security Guarantees

1. **Zero Key Conflation:** Keeper, Delta Hedger, dan Vol Publisher memakai 3 keypair berbeda yang tidak boleh tumpang tindih. Exploit pada key Hedger tidak bisa memposting data vol atau menjalankan fungsi keeper. Admin ditahan timelock 48 jam (`script/CaveatCloser.sol`), bukan EOA.
2. **Owner-Only Payout Destination:** The `AgentRouter` smart contract enforces that all option tokens minted and all proceeds from option sales are paid directly to the delegating owner account. The agent key has zero custody.
3. **Selling Is Never Blocked:** Administrative buy pauses do not block traders from selling their options. When a market halt occurs, sells automatically escrow into `queuedSells` with ticket receipts.
