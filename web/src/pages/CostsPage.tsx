import React, { useEffect } from 'react';
import { DollarSign, Layers, Clock, ShieldCheck } from 'lucide-react';
import { applySurplusPalette } from '../data/surplusTheme';

export const CostsPage: React.FC = () => {
  useEffect(() => {
    applySurplusPalette('costs');
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 font-mono text-[var(--surplus-line)] space-y-8">
      <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-2">
        <span className="text-xs uppercase tracking-wider text-[var(--surplus-line-62)]">Transparency & Economics</span>
        <h1 className="text-3xl sm:text-4xl font-display font-medium text-[var(--surplus-line)]">
          Protocol Fee & Cost Structure
        </h1>
        <p className="text-xs text-[var(--surplus-line-62)]">
          Complete transparent fee breakdown across trading, funding decay, and pool liquidity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
        {/* Trading Fee */}
        <div className="surplus-window p-6 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">Trading Protocol Fee</h2>
          </div>
          <div className="text-2xl font-bold font-tabular text-emerald-400">3 bps (0.03%)</div>
          <p className="text-[var(--surplus-line-80)] leading-relaxed">
            Applied to notional settlement value upon every option buy and sell transaction. Distributed 80% to Writer Pool liquidity providers, 10% to DAO treasury, 5% to insurance reserve, and 5% burn.
          </p>
        </div>

        {/* Writer Pool Anti-Dilution Fee */}
        <div className="surplus-window p-6 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">Anti-Dilution Deposit Entry</h2>
          </div>
          <div className="text-2xl font-bold font-tabular text-amber-400">10 bps (0.10%)</div>
          <p className="text-[var(--surplus-line-80)] leading-relaxed">
            Deducted upon liquidity deposit into the Writer Pool to prevent front-running existing liquidity providers prior to volatility events. Retained directly inside pool NAV.
          </p>
        </div>

        {/* In-Kind Funding Decay */}
        <div className="surplus-window p-6 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">In-Kind Funding Decay (Norm)</h2>
          </div>
          <div className="text-2xl font-bold font-tabular text-cyan-400">Euler-Cauchy Decay</div>
          <p className="text-[var(--surplus-line-80)] leading-relaxed">
            Everlasting options pay continuous funding to the Writer Pool. Decay accumulates in the series normalization factor (<code className="text-amber-300">norm</code>), decreasing effective units over time instead of requiring periodic cash payments.
          </p>
        </div>

        {/* Gas Fees */}
        <div className="surplus-window p-6 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">Network Gas Fees</h2>
          </div>
          <div className="text-2xl font-bold font-tabular text-indigo-400">&lt; $0.001 USDG</div>
          <p className="text-[var(--surplus-line-80)] leading-relaxed">
            Robinhood Chain operates on high-throughput Arbitrum Nitro architecture, ensuring sub-cent transaction execution fees for options minting, burns, and queue registrations.
          </p>
        </div>
      </div>
    </div>
  );
};
