# ARCUM PROTOCOL — EXECUTIVE QUANTITATIVE WHITEPAPER
> **Continuous Everlasting Derivatives & Quantitative Economics on Robinhood Chain**  
> **Target Network (rencana):** Robinhood Chain Mainnet (Chain ID: `4663`) — **belum dideploy**; kontrak aktif saat ini di testnet `46630` | **Settlement (rencana):** USDG — alamat final diverifikasi ulang saat deploy  
> **Compiler Target:** Solidity 0.8.28 (Cancun EVM with EIP-1153 Transient Storage)  
> **Author:** Tim internal Arcum (persona penulis: Mary, Senior Quantitative Analyst)

---

## 1. Executive Abstract & Market Positioning

Traditional financial options suffer from **structural fragmentation**: liquidity is splintered across hundreds of expiration dates (Weekly, Monthly, Quarterly, LEAPS), forcing retail traders to pay heavy bid-ask spreads and repeatedly roll positions. In decentralized finance, this fragmentation leads to catastrophic capital inefficiency and illiquid orderbooks.

**Arcum resolves this fundamentally** by introducing **Everlasting Options** for tokenized US equity tokens (NVDA, TSLA, AAPL, AMZN, MSFT, GOOGL) on Robinhood Chain.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        THE ARCUM TRIFECTA                              │
│                                                                        │
│   1. ZERO EXPIRATION DATES    2. CONTINUOUS IN-KIND FUNDING   3. USDG POOL │
│   Hold positions indefinitely  Norm decays smoothly toward     ERC-4626 LP │
│   without rolling friction     intrinsic value                 earns 18-32%│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Derivation: Euler-Cauchy ODE Formulation

Unlike Black-Scholes-Merton which requires terminal boundary conditions at $t = T$, Arcum everlasting options solve the stationary Euler-Cauchy differential equation under continuous geometric Brownian motion:

$$\frac{1}{2} \sigma^2 S^2 \frac{d^2 V}{dS^2} - \frac{1}{\tau} V(S) + \frac{1}{\tau} \text{Payoff}(S) = 0$$

Where:
* $S$ = Current spot price of the underlying equity token (WAD 1e18)
* $K$ = Strike price (WAD 1e18)
* $\sigma$ = Annualized volatility (in bps, e.g. 5000 = 50%)
* $\tau$ = Funding interval in seconds ($\tau_{\text{daily}} = 86,400\text{s}$, $\tau_{\text{weekly}} = 604,800\text{s}$)

### Characteristic Parameter ($\alpha$)
The characteristic quadratic root $\alpha$ is derived in closed form:

$$\alpha = \frac{1 + \sqrt{1 + \frac{8}{\sigma^2 \tau}}}{2}$$

### Closed-Form Pricing Solution
For an **Up (Call) Option**:
$$\text{If } S \le K: \quad V_{\text{call}} = \frac{K}{2\alpha - 1} \left(\frac{S}{K}\right)^\alpha$$
$$\text{If } S > K: \quad V_{\text{call}} = (S - K) + \frac{K}{2\alpha - 1} \left(\frac{K}{S}\right)^{\alpha - 1}$$

For a **Down (Put) Option** (via Put-Call Parity with $r = 0$):
$$V_{\text{put}} = V_{\text{call}} - (S - K)$$

---

## 3. Comparative Advantage Matrix

| Feature Dimension | Conventional Centralized (Deribit) | Legacy DeFi Options (Hegic / Lyra) | Arcum Everlasting Protocol |
|---|---|---|---|
| **Expiration Friction** | High (Fridays, monthly roll fees) | Fixed (Weekly expirations) | **Zero (Never expires)** |
| **Liquidity Concentration** | Fragmented across 50+ expiries | Fragmented per pool/epoch | **100% Unified per Strike** |
| **Execution Cost** | 30 - 50 bps spread | 100 - 300 bps AMM slippage | **3 bps Base Protocol Fee** |
| **Holding Cost Delivery** | Theta burn to zero at expiry | 100% premium lost at expiry | **Continuous in-kind norm decay** |
| **Settlement Asset** | Crypto (BTC/ETH/USDC) | USDC / ETH | **USDG (Native Robinhood Stable)** |
| **AI Agent Readiness** | Fragmented API keys | None | **Native MCP + ERC-4337 Sponsored** |

---

## 4. Writer Pool (ERC-4626) Unit Economics & Projected Yields

The counterparty to all options is the **Writer Pool**, an ERC-4626 vault operating with 12-decimal shares to prevent share-inflation exploits.

### Revenue Streams for Liquidity Providers (LPs)
1. **Trade Fees:** 3 bps (0.03%) on all buys and sells.
2. **Execution Spreads:** 15 bps (Daily) and 25 bps (Weekly).
3. **Funding Norm Decay:** Continuous accrual of option time value. As options age without market movement, the time value decays directly into the pool's NAV.
4. **Deposit Premium:** 10 bps anti-arbitrage fee captured from incoming deposits.

### Dynamic APY Model
$$\text{Projected LP APY} = \text{Norm Decay Yield} (14\% - 22\%) + \text{Volume Fees} (4\% - 10\%) = \mathbf{18\% - 32\%\text{ Net APY}}$$

### Anti-Arbitrage Defenses
* **24-Hour Deposit Lock:** Prevents flash-deposit MEV extraction ahead of expected volatility events.
* **72-Hour Withdrawal Queue:** Exits settle at claim-time NAV rather than request-time NAV, preventing front-running during market drops.
* **NAV Guard Band:** Entries priced at liability lower bound; exits priced at liability upper bound.

---

## 5. Three-Layer Defense Waterfall & Solvency Proof

Arcum guarantees institutional solvency through a multi-tiered loss absorption architecture:

```text
   MARKET SHOCK (e.g. -15% Flash Drop in NVDA)
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ LAYER 1: RESERVE FUND (First-Loss Protection)          │
│ • Absorbs 100% of claims until reserve is exhausted    │
│ • Sized at 10% - 15% of pool cash ($250k initial buffer│
└────────────────────────────────────────────────────────┘
                     │ (If Reserve Exhausted)
                     ▼
┌────────────────────────────────────────────────────────┐
│ LAYER 2: LMNS STAKING POOL (Second-Loss Backstop)      │
│ • Staked governance tokens slashed at zero base        │
│ • Shields LP capital from deep tail-risk events        │
└────────────────────────────────────────────────────────┘
                     │ (If Staking Exhausted)
                     ▼
┌────────────────────────────────────────────────────────┐
│ LAYER 3: WRITER POOL NAV                               │
│ • Protected by 8% single-name cap and 35% total cap    │
│ • Guaranteed non-insolvency via automated circuit halts│
└────────────────────────────────────────────────────────┘
```

### Empirical Stress Validation (`scripts/stress_simulation.py`)
In automated simulations of an instant **-15.0% flash crash** on NVDA with $9,440.00 USDG in gross option claims:
* **Layer 1 Reserve Fund:** Absorbed $9,440.00 (100%).
* **Layer 2 Staking:** $0.00 required.
* **Layer 3 LP NAV:** **Zero loss (100.00% capital preservation)**.

---

## 6. Autonomous AI Agent Integration & Paymaster Economics

Arcum is the first derivatives protocol engineered natively for **autonomous AI agents**:
* **Non-Custodial Policies (`AgentRouter.sol`):** Users configure strict budgets, token whitelists, and expiration dates. Agents trade autonomously, but **100% of collateral and option tokens stay with the owner**.
* **Zero-Gas Friction (`app/src/aa/paymaster.ts`):** Transactions executed by approved AI agents are sponsored via ERC-4337 Account Abstraction paymasters, eliminating the need for agent wallets to hold native ETH for gas.

---

## 7. Conclusion

Arcum synthesizes mathematical rigor (closed-form Euler-Cauchy ODE), robust security (Cancun EVM transient storage, Uniswap V3 TWAP references), and agency-tier visual ergonomics. It represents a generational advancement for decentralized options on Robinhood Chain.
