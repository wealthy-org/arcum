import React, { useEffect } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Shield, Lock } from 'lucide-react';
import { applySurplusPalette } from '../data/surplusTheme';

interface ProductsPageProps {
  onNavigate: (route: string, tab?: string) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    applySurplusPalette('trade');
  }, []);

  return (
    <div className="_4VSiGW_screen max-w-5xl mx-auto space-y-10 font-mono text-[var(--surplus-line)]">
      <div className="space-y-3">
        <span className="text-[11px] uppercase tracking-wider text-[var(--surplus-line-62)]">
          Non-Expiring Derivatives Suite
        </span>
        <h1 className="_4VSiGW_title">Arcum Derivative Mechanisms</h1>
        <p className="_4VSiGW_sub">
          Native to Robinhood Chain with USDG settlement. Four synchronized mechanisms designed to eliminate expiration friction and deliver deep liquidity.
        </p>
      </div>

      <div className="space-y-6">
        {/* Product 1: Up Options */}
        <div className="surplus-window p-6 sm:p-8 rounded-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-400 font-bold">
                CALL
              </span>
              <h2 className="text-xl font-display font-medium text-[var(--surplus-line)]">
                Up Options (Calls)
              </h2>
            </div>
            <p className="text-xs text-[var(--surplus-line-80)] leading-relaxed">
              Gain leveraged upside exposure to tokenized stocks (NVDA, TSLA, SPY, QQQ, AAPL). Pay a bounded USDG premium upfront. 
              Zero margin calls or liquidations. Effective units decay continuously via the series normalization factor.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--surplus-line-62)] pt-1">
              <span>Daily (τ = 86,400s)</span>
              <span>•</span>
              <span>Weekly (τ = 604,800s)</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">3 bps Protocol Fee</span>
            </div>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <button
              onClick={() => onNavigate('dashboard', 'trade')}
              className="stamp-btn py-3 px-6 text-xs font-bold w-full sm:w-auto"
            >
              <span>Trade Up Calls</span>
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </button>
          </div>
        </div>

        {/* Product 2: Down Options */}
        <div className="surplus-window p-6 sm:p-8 rounded-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded border border-rose-500/40 text-rose-400 font-bold">
                PUT
              </span>
              <h2 className="text-xl font-display font-medium text-[var(--surplus-line)]">
                Down Options (Puts)
              </h2>
            </div>
            <p className="text-xs text-[var(--surplus-line-80)] leading-relaxed">
              Profit from downside stock moves or hedge underlying synthetic equity. 
              Closed-form put-call parity guarantees exact non-linear pricing without expiry cliffs.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--surplus-line-62)] pt-1">
              <span>Daily & Weekly Funding</span>
              <span>•</span>
              <span className="text-rose-400 font-bold">In-Kind Funding</span>
            </div>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <button
              onClick={() => onNavigate('dashboard', 'trade')}
              className="stamp-btn py-3 px-6 text-xs font-bold w-full sm:w-auto"
            >
              <span>Trade Down Puts</span>
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </button>
          </div>
        </div>

        {/* Product 3: 1-Click Shield */}
        <div className="surplus-window p-6 sm:p-8 rounded-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <h2 className="text-xl font-display font-medium text-[var(--surplus-line)]">
                Portfolio Shield
              </h2>
            </div>
            <p className="text-xs text-[var(--surplus-line-80)] leading-relaxed">
              Downside insurance for Stock Token holders on Robinhood Chain. Selects the listed weekly put closest below your chosen protection level.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--surplus-line-62)] pt-1">
              <span>Non-Custodial</span>
              <span>•</span>
              <span>Auto-Selection</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">Continuous Protection</span>
            </div>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <button
              onClick={() => onNavigate('dashboard', 'shield')}
              className="stamp-btn py-3 px-6 text-xs font-bold w-full sm:w-auto"
            >
              <span>Activate Shield</span>
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </button>
          </div>
        </div>

        {/* Product 4: Writer Pool */}
        <div className="surplus-window p-6 sm:p-8 rounded-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xl font-display font-medium text-[var(--surplus-line)]">
                USDG Writer Pool (AWP Vault)
              </h2>
            </div>
            <p className="text-xs text-[var(--surplus-line-80)] leading-relaxed">
              Deposit USDG to underwrite options liquidity and capture 80% protocol fees. Protected by automated spot delta-hedging and Layer 1 Reserve solvency fund.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--surplus-line-62)] pt-1">
              <span>On-Chain Solvency Layer</span>
              <span>•</span>
              <span>Layer 1 Reserve Backed</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">80% Protocol Fee Share</span>
            </div>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <button
              onClick={() => onNavigate('dashboard', 'pool')}
              className="stamp-btn py-3 px-6 text-xs font-bold w-full sm:w-auto"
            >
              <span>Deposit Liquidity</span>
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
