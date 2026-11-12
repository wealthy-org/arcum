import React, { useState, useEffect } from 'react';
import { Calculator, Activity, Sparkles } from 'lucide-react';
import { calculateAlpha, quoteOption } from '../utils/pricing';
import { applySurplusPalette } from '../data/surplusTheme';

export const LearnPage: React.FC = () => {
  const [calcSpot, setCalcSpot] = useState<number>(142.5);
  const [calcStrike, setCalcStrike] = useState<number>(145.0);
  const [calcIv, setCalcIv] = useState<number>(52);
  const [calcSpeed, setCalcSpeed] = useState<'DAILY' | 'WEEKLY'>('DAILY');

  useEffect(() => {
    applySurplusPalette('docs');
  }, []);

  const q = quoteOption(
    calcSpot,
    calcStrike,
    calcIv * 100,
    calcSpeed,
    true,
    1
  );

  const tau = calcSpeed === 'DAILY' ? 86400 : 604800;
  const alpha = calculateAlpha(calcIv * 100, tau);

  return (
    <div className="_4VSiGW_screen max-w-5xl mx-auto space-y-10 font-mono text-[var(--surplus-line)]">
      <div className="space-y-3">
        <span className="text-[11px] uppercase tracking-wider text-[var(--surplus-line-62)]">
          Quantitative Foundations
        </span>
        <h1 className="_4VSiGW_title">Closed-Form ODE Pricing Sandbox</h1>
        <p className="_4VSiGW_sub">
          Arcum Everlasting Options solve the Euler-Cauchy differential equation under continuous geometric Brownian motion. 
          Interact with the live mathematical model below to observe characteristic parameter alpha (α), mark price, and Greeks.
        </p>
      </div>

      {/* Interactive Sandbox Card */}
      <div className="surplus-window p-6 sm:p-8 rounded-2xl space-y-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--surplus-line-24)] pb-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-display font-medium text-[var(--surplus-line)]">
              Euler-Cauchy ODE Solver
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded border border-[var(--surplus-line-40)] font-bold text-[var(--surplus-line)]">
            Solidity 0.8.28 Exact Parity
          </span>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--surplus-line-62)]">Spot Price (S)</label>
            <input
              type="number"
              value={calcSpot}
              onChange={(e) => setCalcSpot(parseFloat(e.target.value) || 1)}
              className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-xl px-3 py-2 text-[var(--surplus-line)] font-mono text-sm focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--surplus-line-62)]">Strike Price (K)</label>
            <input
              type="number"
              value={calcStrike}
              onChange={(e) => setCalcStrike(parseFloat(e.target.value) || 1)}
              className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-xl px-3 py-2 text-[var(--surplus-line)] font-mono text-sm focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--surplus-line-62)]">Implied Vol (IV %)</label>
            <input
              type="number"
              value={calcIv}
              onChange={(e) => setCalcIv(parseFloat(e.target.value) || 10)}
              className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-xl px-3 py-2 text-[var(--surplus-line)] font-mono text-sm focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--surplus-line-62)]">Speed (τ)</label>
            <select
              value={calcSpeed}
              onChange={(e) => setCalcSpeed(e.target.value as any)}
              className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-xl px-3 py-2 text-[var(--surplus-line)] font-mono text-sm focus:outline-none"
            >
              <option value="DAILY">Daily (86,400s)</option>
              <option value="WEEKLY">Weekly (604,800s)</option>
            </select>
          </div>
        </div>

        {/* Live Mathematical Solution Output */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)]">
          <div>
            <div className="text-[11px] text-[var(--surplus-line-62)]">Characteristic Root (α)</div>
            <div className="text-xl font-bold text-[var(--surplus-line)] font-tabular">{alpha.toFixed(4)}</div>
            <div className="text-[10px] text-[var(--surplus-line-62)]">Curvature eigenvalue</div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--surplus-line-62)]">Theoretical Mark Price</div>
            <div className="text-xl font-bold text-emerald-400 font-tabular">${q.markPriceUsdg.toFixed(3)}</div>
            <div className="text-[10px] text-[var(--surplus-line-62)]">USDG per stock token</div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--surplus-line-62)]">Delta Sensitivity (Δ)</div>
            <div className="text-xl font-bold text-[var(--surplus-line)] font-tabular">{q.delta.toFixed(3)}</div>
            <div className="text-[10px] text-[var(--surplus-line-62)]">Hedge ratio ∂V/∂S</div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--surplus-line-62)]">Daily Norm Decay</div>
            <div className="text-xl font-bold text-amber-400 font-tabular">-${q.dailyDecayUsdg.toFixed(3)}</div>
            <div className="text-[10px] text-[var(--surplus-line-62)]">Holding cost per unit</div>
          </div>
        </div>

        {/* Closed-Form Mathematical Proof Display */}
        <div className="space-y-3 border-t border-[var(--surplus-line-24)] pt-6 text-xs text-[var(--surplus-line-80)]">
          <div className="font-bold text-[var(--surplus-line)] text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Closed-Form ODE Boundary Proof</span>
          </div>
          <p className="leading-relaxed">
            The fundamental valuation formula resolves the boundary condition $V(S) = (S - K)^+$ under continuous geometric Brownian motion:
          </p>
          <div className="p-4 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-ground)] text-xs font-mono space-y-2">
            <div><strong>Up (Call):</strong> <code>V(S) = (S / (α - 1)) * (S / K)^(-α)</code>  [for S &le; K]</div>
            <div><strong>Down (Put):</strong> <code>V(S) = (K / (α + 1)) * (S / K)^(-α)</code>  [for S &le; K]</div>
            <div><strong>Funding Norm Decay:</strong> <code>Norm(t) = Norm(0) * exp(-t / τ)</code></div>
          </div>
        </div>
      </div>
    </div>
  );
};
