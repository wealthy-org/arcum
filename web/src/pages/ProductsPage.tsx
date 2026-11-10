import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Shield, Layers, DollarSign } from 'lucide-react';

interface ProductsPageProps {
  onNavigate: (route: string) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16 space-y-12">
      <div className="space-y-4 max-w-3xl">
        <span className="font-mono text-xs uppercase tracking-widest text-arcum-cyan font-bold">
          Non-Expiring Derivatives Suite
        </span>
        <h1 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight">
          Arcum Derivative Mechanisms
        </h1>
        <p className="text-base text-arcum-muted leading-relaxed">
          Native to Robinhood Chain with USDG settlement. Four synchronized mechanisms designed to eliminate expiration friction and deliver deep liquidity.
        </p>
      </div>

      <div className="space-y-6">
        {/* Product 1: Up Options */}
        <div className="p-8 rounded-xl bg-arcum-bgElevated border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center hover:border-arcum-cyan/30 transition-all">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-arcum-up/10 text-arcum-up font-bold">
                CALL
              </span>
              <h2 className="text-2xl font-display font-bold text-white">Up Options (Calls)</h2>
            </div>
            <p className="text-sm text-arcum-muted leading-relaxed">
              Gain leveraged upside exposure to tokenized stocks (NVDA, TSLA, SPY, QQQ, AAPL). Pay a bounded USDG premium upfront. 
              Zero margin calls or liquidations. Effective units decay continuously via the series normalization factor.
            </p>
            <div className="flex gap-4 text-xs font-mono text-arcum-muted pt-1">
              <span>Daily Speed (τ = 86,400s)</span>
              <span>•</span>
              <span>Weekly Speed (τ = 604,800s)</span>
              <span>•</span>
              <span className="text-emerald-400">3 bps Protocol Fee</span>
            </div>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-display font-bold text-xs tracking-wider uppercase hover:opacity-95 transition-all shadow-[0_4px_16px_rgba(2,132,199,0.3)] dark:shadow-[0_0_20px_rgba(25,230,255,0.3)] drop-shadow-sm active:scale-95"
            >
              Trade Up Calls
            </button>
          </div>
        </div>

        {/* Product 2: Down Options */}
        <div className="p-8 rounded-xl bg-arcum-bgElevated border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center hover:border-arcum-cyan/30 transition-all">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-arcum-down/10 text-arcum-down font-bold">
                PUT
              </span>
              <h2 className="text-2xl font-display font-bold text-white">Down Options (Puts)</h2>
            </div>
            <p className="text-sm text-arcum-muted leading-relaxed">
              Profit from downside stock moves or hedge underlying synthetic equity. 
              Closed-form put-call parity (V_put = V_call - (S - K)) guarantees exact non-linear pricing without expiry cliffs.
            </p>
            <div className="flex gap-4 text-xs font-mono text-arcum-muted pt-1">
              <span>Daily & Weekly Funding</span>
              <span>•</span>
              <span>USDG Settlement</span>
              <span>•</span>
              <span className="text-arcum-cyan">Non-Custodial</span>
            </div>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 rounded-lg bg-arcum-surface hover:bg-white/10 border border-white/10 text-white font-display font-semibold text-xs tracking-wider uppercase transition-all"
            >
              Trade Down Puts
            </button>
          </div>
        </div>

        {/* Product 3: 1-Click Shield */}
        <div className="p-5 sm:p-8 rounded-2xl bg-arcum-bgElevated border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center hover:border-arcum-cyan/30 transition-all">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-arcum-cyan/10 text-arcum-cyan font-bold">
                PROTECTION
              </span>
              <h2 className="text-2xl font-display font-bold text-white">1-Click Automated Shield</h2>
            </div>
            <p className="text-sm text-arcum-muted leading-relaxed">
              Automated downside floor for stock token holders. Select your protection level (5% or 10% below spot) and Shield purchases 
              the optimal weekly put series in a single transaction, holding the floor indefinitely until you decide to close.
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs font-mono text-arcum-muted pt-1">
              <span>Weekly Speed (Low Drag)</span>
              <span className="hidden sm:inline">•</span>
              <span>Zero Liquidation Risk</span>
            </div>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full lg:w-auto px-6 py-3 rounded-lg bg-arcum-surface hover:bg-white/10 border border-white/10 text-white font-display font-semibold text-xs tracking-wider uppercase transition-all"
            >
              Shield Portfolio
            </button>
          </div>
        </div>

        {/* Product 4: Writer Pool */}
        <div className="p-5 sm:p-8 rounded-2xl bg-arcum-bgElevated border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center hover:border-arcum-cyan/30 transition-all">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                YIELD
              </span>
              <h2 className="text-2xl font-display font-bold text-white">USDG Writer Pool (ERC-4626)</h2>
            </div>
            <p className="text-sm text-arcum-muted leading-relaxed">
              Deposit USDG to underwrite the options sold by the engine. Earn option premiums, trade fees, and daily norm decay yield. 
              Features a 24-hour deposit lock and 72-hour withdrawal queue with pro-rata NAV settlement.
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs font-mono text-arcum-muted pt-1">
              <span className="text-emerald-400">18% - 32% Projected APY</span>
              <span className="hidden sm:inline">•</span>
              <span>12-Decimal Virtual Shares</span>
              <span className="hidden sm:inline">•</span>
              <span>Reserve Fund Protected</span>
            </div>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full lg:w-auto px-6 py-3 rounded-lg bg-arcum-surface hover:bg-white/10 border border-white/10 text-white font-display font-semibold text-xs tracking-wider uppercase transition-all"
            >
              Deposit USDG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
