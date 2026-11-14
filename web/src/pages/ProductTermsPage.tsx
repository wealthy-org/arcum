import React, { useEffect } from 'react';
import { AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { applySurplusPalette } from '../data/surplusTheme';

export const ProductTermsPage: React.FC = () => {
  useEffect(() => {
    applySurplusPalette('terms');
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 font-mono text-[var(--surplus-line)] space-y-8">
      <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-2">
        <span className="text-xs uppercase tracking-wider text-[var(--surplus-line-62)]">Terms & Conditions</span>
        <h1 className="text-3xl sm:text-4xl font-display font-medium text-[var(--surplus-line)]">
          Product Terms of Service
        </h1>
        <p className="text-xs text-[var(--surplus-line-62)]">
          Effective: November 2026 • Arcum Protocol
        </p>
      </div>

      <div className="surplus-window p-6 sm:p-8 rounded-2xl space-y-6 text-xs leading-relaxed">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <span>
            Testnet Warning: Arcum is currently deployed on Robinhood Chain Testnet (Chain ID 46630). All tokens (USDG, synthetic stocks, AWP shares) are mock assets with zero real economic value.
          </span>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">1. Non-Custodial Smart Contract Interface</h2>
          <p className="text-[var(--surplus-line-80)]">
            Arcum provides a web graphical interface interacting directly with public, decentralized smart contracts deployed on Robinhood Chain. Arcum does not take custody of user funds, does not manage private keys, and cannot reverse transactions once submitted to the blockchain.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">2. Derivative Mechanics & Holding Cost (Funding Decay)</h2>
          <p className="text-[var(--surplus-line-80)]">
            Everlasting options do not expire at a fixed date. Instead, they continually pay in-kind funding decay to the Writer Pool. This funding is reflected as a continuous decay in each series’ normalization factor (<code className="text-amber-300">norm</code>). Traders must understand that holding an out-of-the-money everlasting option for extended periods will steadily erode effective position size.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">3. Shield Protection Limitations</h2>
          <p className="text-[var(--surplus-line-80)]">
            The Shield feature purchases a listed weekly put option closest below your requested strike percentage. <strong>Shield does not provide a guaranteed permanent floor and does not renew automatically.</strong> Like all options, weekly puts experience time decay and eventually mature or require fresh purchase.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">4. Writer Pool Liquidity & Withdrawal Queue</h2>
          <p className="text-[var(--surplus-line-80)]">
            Depositing into the Writer Pool involves underwriting option market risk. Pool shares (AWP) fluctuate with overall pool Net Asset Value (NAV). To protect solvency, withdrawals are governed by an on-chain asynchronous notice queue with a 7-day claim window. After 7 days, unclaimed tickets automatically requeue on-chain.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">5. Autonomous AI Agents Delegation</h2>
          <p className="text-[var(--surplus-line-80)]">
            Users granting trading permissions to AI agents via <code className="text-amber-300">AgentRouter.sol</code> must set strict budget caps and limits. While contracts ensure that minted tokens and proceeds flow strictly back to the delegator, users remain solely responsible for any trades executed within their active policy parameters prior to revoking permissions.
          </p>
        </section>
      </div>
    </div>
  );
};
