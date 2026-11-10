import React, { useState } from 'react';
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Layers,
  Zap,
  Lock,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  Activity,
  BarChart3,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { StockInfo } from '../types';
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from '../data/protocol';
import { quoteOption } from '../utils/pricing';

interface LandingPageProps {
  onNavigate: (route: string) => void;
  stocks: StockInfo[];
  onSelectStock: (stock: StockInfo) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  stocks,
  onSelectStock,
}) => {
  const [selectedStock, setSelectedStock] = useState<StockInfo>(stocks[0]);
  const [optionSide, setOptionSide] = useState<'UP' | 'DOWN'>('UP');
  const [optionSpeed, setOptionSpeed] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [copiedContract, setCopiedContract] = useState<string | null>(null);

  // Live calculation for the interactive terminal card
  const heroQuote = quoteOption(
    selectedStock.price,
    selectedStock.price,
    optionSpeed === 'DAILY' ? selectedStock.ivDailyBps : selectedStock.ivWeeklyBps,
    optionSpeed,
    optionSide === 'UP',
    10
  );

  const handleCopy = (key: string, addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedContract(key);
    setTimeout(() => setCopiedContract(null), 2000);
  };

  return (
    <div className="w-full bg-arcum-bg text-arcum-text">
      {/* 
        HERO SECTION 
        Anti-slop principles applied:
        - No floating pill badge with pulsing dots
        - Scale jump: giant display title (Unbounded) with tight leading
        - Off-center asymmetric composition: high density text left, interactive terminal right
        - No generic 1px gray borders everywhere; tone steps define surface boundaries
      */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28">
        {/* Subtle radial ambient atmosphere */}
        <div className="pointer-events-none absolute right-0 top-0 size-[600px] bg-arcum-cobalt/15 blur-[140px]" />
        <div className="pointer-events-none absolute left-[-100px] bottom-0 size-[500px] bg-arcum-cyan/10 blur-[130px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.1fr_0.9fr] items-center gap-12 lg:gap-16">
          {/* Left Column: Authoritative Editorial Statement */}
          <div className="space-y-8 z-10">
            <div className="space-y-5">
              <span className="font-mono text-xs uppercase tracking-widest text-arcum-cyan font-bold">
                Robinhood Chain • Chain ID 4663
              </span>
              <h1 className="text-4xl sm:text-6xl lg:text-[4.25rem] font-display font-bold tracking-tight text-white leading-[1.05]">
                Built for the{' '}
                <span className="text-prism animate-prism-pan">
                  flow
                </span>{' '}
                of everlasting options.
              </h1>
              <p className="text-base sm:text-lg text-arcum-muted max-w-xl leading-relaxed">
                Arcum builds continuous non-expiring derivatives on Robinhood Chain. 
                In-kind funding norm decay replaces Friday expirations, governed by closed-form Euler-Cauchy ODE pricing for tokenized US equities.
              </p>
            </div>

            {/* Direct Action Line */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-7 py-3.5 rounded-lg bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-display font-bold text-xs tracking-wider uppercase hover:opacity-95 transition-all shadow-[0_4px_20px_rgba(2,132,199,0.35)] dark:shadow-[0_0_24px_rgba(25,230,255,0.35)] active:scale-95 flex items-center gap-2 drop-shadow-sm"
              >
                <span>Launch App</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('markets')}
                className="px-6 py-3.5 rounded-lg bg-arcum-bgElevated border border-white/10 hover:border-white/20 text-white font-mono text-xs transition-colors"
              >
                Explore Chains
              </button>

              <button
                onClick={() => onNavigate('docs')}
                className="px-4 py-3.5 text-xs font-mono text-arcum-cyan hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span>Read Documentation</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Contract Registry Quick Stamp */}
            <div className="pt-2 text-xs font-mono text-arcum-muted flex items-center gap-2 overflow-hidden">
              <span className="text-white/40 shrink-0">Verified Engine:</span>
              <span className="text-arcum-cyan font-semibold truncate font-mono">{CONTRACT_ADDRESSES.engineProxy}</span>
            </div>
          </div>

          {/* Right Column: Real Interactive Trading Surface (Operate mode) */}
          <div className="relative z-10">
            <div className="rounded-xl bg-arcum-bgElevated border border-white/10 p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-5 sm:space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <span className="text-xs font-mono text-arcum-muted uppercase">Closed-Form Solver</span>
                  <div className="font-display font-bold text-white text-sm mt-0.5">
                    Live Engine Terminal
                  </div>
                </div>
                <span className="text-xs font-mono text-arcum-cyan px-2.5 py-1 rounded bg-arcum-cyan/10 border border-arcum-cyan/25 shrink-0">
                  Euler-Cauchy ODE
                </span>
              </div>

              {/* Underlying Stock Selector */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-arcum-muted">Tokenized Underlying:</span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {stocks.map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => setSelectedStock(s)}
                      className={`p-2 rounded-lg text-center transition-all ${
                        selectedStock.symbol === s.symbol
                          ? 'bg-arcum-cyan/20 border border-arcum-cyan/50 text-white font-bold'
                          : 'bg-arcum-surface border border-white/5 text-arcum-muted hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-mono">{s.symbol}</div>
                      <div className="text-[10px] text-arcum-muted mt-0.5">${s.price.toFixed(1)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Side & Speed Switches */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex rounded-lg bg-arcum-surface p-1 border border-white/5 font-mono text-xs">
                  <button
                    onClick={() => setOptionSide('UP')}
                    className={`flex-1 py-1.5 rounded text-center transition-all ${
                      optionSide === 'UP'
                        ? 'bg-arcum-up/20 text-arcum-up font-bold'
                        : 'text-arcum-muted'
                    }`}
                  >
                    Up (Call)
                  </button>
                  <button
                    onClick={() => setOptionSide('DOWN')}
                    className={`flex-1 py-1.5 rounded text-center transition-all ${
                      optionSide === 'DOWN'
                        ? 'bg-arcum-down/20 text-arcum-down font-bold'
                        : 'text-arcum-muted'
                    }`}
                  >
                    Down (Put)
                  </button>
                </div>

                <div className="flex rounded-lg bg-arcum-surface p-1 border border-white/5 font-mono text-xs">
                  <button
                    onClick={() => setOptionSpeed('DAILY')}
                    className={`flex-1 py-1.5 rounded text-center transition-all ${
                      optionSpeed === 'DAILY'
                        ? 'bg-white/15 text-white font-bold'
                        : 'text-arcum-muted'
                    }`}
                  >
                    Daily (τ=1d)
                  </button>
                  <button
                    onClick={() => setOptionSpeed('WEEKLY')}
                    className={`flex-1 py-1.5 rounded text-center transition-all ${
                      optionSpeed === 'WEEKLY'
                        ? 'bg-white/15 text-white font-bold'
                        : 'text-arcum-muted'
                    }`}
                  >
                    Weekly (τ=7d)
                  </button>
                </div>
              </div>

              {/* Live Quantitative Telemetry Grid */}
              <div className="rounded-lg bg-arcum-surface p-4 font-mono text-xs space-y-2.5">
                <div className="flex justify-between items-center text-white">
                  <span className="text-arcum-muted">Settlement Standard:</span>
                  <span className="font-bold text-arcum-cyan">USDG (6 Decimals)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-arcum-muted">Mark Price:</span>
                  <span className="text-white font-bold font-tabular">${heroQuote.markPriceUsdg.toFixed(3)} USDG / unit</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-arcum-muted">Base Protocol Fee:</span>
                  <span className="text-emerald-400 font-bold">3 bps (0.03%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-arcum-muted">Delta Exposure (Δ):</span>
                  <span className="text-arcum-cyan font-bold font-tabular">{heroQuote.delta.toFixed(3)}</span>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-white/[0.08] text-white">
                  <span className="font-medium">Total Notional Cost (10 Units):</span>
                  <span className="text-emerald-400 font-bold text-sm font-tabular">${heroQuote.totalCostUsdg.toFixed(2)} USDG</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full py-3 rounded-lg bg-white/5 hover:bg-arcum-cyan/15 hover:border-arcum-cyan/30 border border-white/10 text-white font-display text-xs font-semibold uppercase tracking-wider transition-all text-center"
              >
                Trade {selectedStock.symbol} in Full Terminal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 
        SECTION 1: NATIVE TO ROBINHOOD CHAIN
        Anti-slop redesign:
        - Banned AI index "01"
        - Asymmetric stat breakdown with visual anchor instead of 4 identical cards
      */}
      <section className="border-t border-white/[0.08] py-20 lg:py-24 bg-arcum-bgElevated/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="max-w-3xl space-y-4">
            <span className="font-mono text-xs uppercase tracking-widest text-arcum-cyan font-bold">
              High-Throughput Settlement
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-semibold text-white tracking-tight leading-tight">
              Derivatives where tokenized equities live.
            </h2>
            <p className="text-base text-arcum-muted leading-relaxed">
              Robinhood Chain unifies tokenized US stocks, ETH and native USDG onto one high-performance EVM rollup. 
              Arcum sits directly at the derivatives foundation: non-expiring Up & Down series, continuous in-kind funding decay, and automated Shield hedging.
            </p>
          </div>

          {/* Asymmetric Metrics Display (Structure from scale & tone steps) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Primary Hero Metric (Spans 5 cols) */}
            <div className="md:col-span-5 p-8 rounded-xl bg-arcum-surface space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-arcum-muted">Writer Pool Liquidity</span>
                <div className="text-4xl sm:text-5xl font-display font-bold text-white font-tabular mt-2">
                  $2,500,000
                </div>
                <div className="text-xs font-mono text-arcum-cyan mt-1">USDG Native Capital</div>
              </div>
              <p className="text-xs text-arcum-muted leading-relaxed pt-4 border-t border-white/5">
                ERC-4626 vault utilizing 12-decimal virtual shares to eliminate inflation exploits, secured by a 24-hour deposit lock and 72-hour withdrawal queue.
              </p>
            </div>

            {/* Supporting Metrics (Spans 7 cols in 2x2 asymmetric flow) */}
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-arcum-bg space-y-2">
                <span className="text-xs font-mono text-arcum-muted uppercase">Cumulative Notional Volume</span>
                <div className="text-2xl sm:text-3xl font-display font-bold text-white font-tabular">$18.42M</div>
                <span className="text-[11px] text-arcum-muted block">Settled continuously in USDG</span>
              </div>

              <div className="p-6 rounded-xl bg-arcum-bg space-y-2">
                <span className="text-xs font-mono text-arcum-muted uppercase">Protocol Base Fee</span>
                <div className="text-2xl sm:text-3xl font-display font-bold text-emerald-400 font-tabular">3 bps</div>
                <span className="text-[11px] text-arcum-muted block">0.03% on buys and sells</span>
              </div>

              <div className="p-6 rounded-xl bg-arcum-bg space-y-2">
                <span className="text-xs font-mono text-arcum-muted uppercase">Rollup Block Latency</span>
                <div className="text-2xl sm:text-3xl font-display font-bold text-arcum-cyan font-tabular">&lt; 0.4s</div>
                <span className="text-[11px] text-arcum-muted block">Cancun EVM execution speed</span>
              </div>

              <div className="p-6 rounded-xl bg-arcum-bg space-y-2">
                <span className="text-xs font-mono text-arcum-muted uppercase">Expiration Friction</span>
                <div className="text-2xl sm:text-3xl font-display font-bold text-white font-tabular">0 Expiries</div>
                <span className="text-[11px] text-arcum-muted block">Hold positions indefinitely</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 
        SECTION 2: TWO HORIZONS / DUAL SPEED ARCHITECTURE
        Anti-slop redesign:
        - Banned AI index "02"
        - Deep comparative substance rather than superficial icon cards
      */}
      <section className="border-t border-white/[0.08] py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="max-w-3xl space-y-4">
            <span className="font-mono text-xs uppercase tracking-widest text-arcum-cyan font-bold">
              Horizon Differentiation
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-semibold text-white tracking-tight leading-tight">
              Daily for precision. Weekly for depth.
            </h2>
            <p className="text-base text-arcum-muted leading-relaxed">
              Different market horizons require different funding intervals. 
              Intraday directional traders need high delta responsiveness. Equity stock token holders need steady, low-friction downside floors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Speed A: Daily */}
            <div className="p-8 rounded-xl bg-arcum-bgElevated space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Daily Speed (τ = 86,400s)
                </span>
                <span className="text-xs font-mono text-arcum-cyan font-bold">15 bps spread</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white">
                Intraday delta & earnings momentum
              </h3>
              <p className="text-sm text-arcum-muted leading-relaxed">
                Tightly tracks underlying equity swings. The rapid decay rate keeps mark prices tethered directly to spot, 
                serving high-frequency traders, breakout strategies, and corporate earnings plays.
              </p>
              <div className="rounded-lg bg-arcum-surface p-4 font-mono text-xs space-y-2 text-arcum-muted">
                <div className="flex justify-between">
                  <span>Funding Interval:</span>
                  <span className="text-white font-bold">86,400 seconds (1 Day)</span>
                </div>
                <div className="flex justify-between">
                  <span>Keeper Accrual:</span>
                  <span className="text-white">Hourly automated checkpoint</span>
                </div>
                <div className="flex justify-between">
                  <span>Optimal Strategy:</span>
                  <span className="text-arcum-cyan font-bold">Active directional trading</span>
                </div>
              </div>
            </div>

            {/* Speed B: Weekly */}
            <div className="p-8 rounded-xl bg-arcum-bgElevated space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Weekly Speed (τ = 604,800s)
                </span>
                <span className="text-xs font-mono text-arcum-cyan font-bold">25 bps spread</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white">
                Institutional holding & Shield insurance
              </h3>
              <p className="text-sm text-arcum-muted leading-relaxed">
                Seven times slower decay rate provides durable, multi-week coverage against stock market crashes. 
                Serves as the foundational engine for 1-Click Automated Shield protection.
              </p>
              <div className="rounded-lg bg-arcum-surface p-4 font-mono text-xs space-y-2 text-arcum-muted">
                <div className="flex justify-between">
                  <span>Funding Interval:</span>
                  <span className="text-white font-bold">604,800 seconds (7 Days)</span>
                </div>
                <div className="flex justify-between">
                  <span>Decay Profile:</span>
                  <span className="text-white">Low-drag continuous holding</span>
                </div>
                <div className="flex justify-between">
                  <span>Optimal Strategy:</span>
                  <span className="text-emerald-400 font-bold">1-Click Shield portfolio hedge</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 
        SECTION 3: ONE ECOSYSTEM (PROTECT & YIELD)
        Anti-slop redesign:
        - Banned AI index "03"
        - Clear narrative flow: Downside Shield vs Writer Pool Yield
      */}
      <section className="border-t border-white/[0.08] py-20 lg:py-24 bg-arcum-bgElevated/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="max-w-3xl space-y-4">
            <span className="font-mono text-xs uppercase tracking-widest text-arcum-cyan font-bold">
              Integrated Protocol Architecture
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-semibold text-white tracking-tight leading-tight">
              Hold the position. Protect the downside.
            </h2>
            <p className="text-base text-arcum-muted leading-relaxed">
              Every option series is an ERC-20 token minted directly to your address. 
              Orders execute non-custodially against the unified Writer Pool with automated circuit breakers and TWAP spot checks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-xl bg-arcum-surface space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-arcum-cyan font-bold">
                For Equity Token Holders
              </span>
              <h3 className="text-2xl font-display font-bold text-white">
                1-Click Automated Shield
              </h3>
              <p className="text-sm text-arcum-muted leading-relaxed">
                Holders of synthetic stock tokens (NVDA, TSLA, AAPL, AMZN, MSFT, GOOGL) can purchase optimal weekly put protection in a single transaction. 
                The engine identifies strikes 5% or 10% below spot, routes USDG premium, and mints protective put tokens automatically.
              </p>
            </div>

            <div className="p-8 rounded-xl bg-arcum-surface space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-arcum-cyan font-bold">
                For Liquidity Providers
              </span>
              <h3 className="text-2xl font-display font-bold text-white">
                3-Layer Solvency Waterfall
              </h3>
              <p className="text-sm text-arcum-muted leading-relaxed">
                LPs in the USDG Writer Pool are shielded by an institutional defense waterfall: First-Loss Reserve Fund ($250k buffer) absorbs claims first, 
                followed by Staking cover, before touching core LP NAV. Proven 100% solvent under simulated -15% market shocks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 
        SECTION 4: VERIFY EVERYTHING (CONTRACT REGISTRY)
        Anti-slop redesign:
        - Banned AI index "05"
        - Clear tabular verification layout
      */}
      <section className="border-t border-white/[0.08] py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="max-w-3xl space-y-4">
            <span className="font-mono text-xs uppercase tracking-widest text-arcum-cyan font-bold">
              Transparent On-Chain Security
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-semibold text-white tracking-tight leading-tight">
              Verified contracts on Robinhood Chain.
            </h2>
            <p className="text-base text-arcum-muted leading-relaxed">
              Every address called by the interface is deployed on Robinhood Chain Mainnet (Chain ID 4663), 
              compiled under Cancun EVM with Solidity 0.8.28, and verified on Sourcify.
            </p>
          </div>

          <div className="rounded-xl bg-arcum-bgElevated overflow-hidden border border-white/10">
            <div className="divide-y divide-white/[0.08]">
              {Object.entries(CONTRACT_ADDRESSES).map(([name, addr]) => (
                <div
                  key={name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div>
                    <span className="font-display font-bold text-white text-sm capitalize">
                      {name}
                    </span>
                    <div className="font-mono text-xs text-arcum-muted mt-0.5">
                      {addr}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(name, addr)}
                      className="px-3 py-1.5 rounded-lg bg-arcum-surface hover:bg-white/10 border border-white/10 text-xs font-mono text-arcum-muted hover:text-white transition-all flex items-center gap-1.5"
                    >
                      {copiedContract === name ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`${CHAIN_CONFIG.blockExplorer}/address/${addr}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-arcum-surface hover:bg-white/10 border border-white/10 text-arcum-muted hover:text-white transition-all"
                      title="View on Explorer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 
        SECTION 5: FINAL CALL TO ACTION (GO WITH THE FLOW)
        Anti-slop redesign:
        - Banned AI index "06"
        - Purpose-driven CTA without decorative fluff
      */}
      <section className="border-t border-white/[0.08] py-20 lg:py-24 bg-arcum-bgElevated/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
            Go with the{' '}
            <span className="text-prism animate-prism-pan">
              flow.
            </span>
          </h2>
          <p className="text-base text-arcum-muted max-w-xl mx-auto leading-relaxed">
            Trade, protect, route. Everlasting options on Robinhood Chain, unified in one non-custodial engine.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-8 py-3.5 rounded-lg bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-display font-bold text-xs tracking-wider uppercase hover:opacity-95 transition-all shadow-[0_4px_20px_rgba(2,132,199,0.35)] dark:shadow-[0_0_24px_rgba(25,230,255,0.35)] active:scale-95 drop-shadow-sm"
            >
              Launch App
            </button>
            <button
              onClick={() => onNavigate('docs')}
              className="px-6 py-3.5 rounded-lg bg-arcum-surface border border-white/10 hover:border-white/20 text-white font-mono text-xs transition-colors"
            >
              Read Documentation
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
