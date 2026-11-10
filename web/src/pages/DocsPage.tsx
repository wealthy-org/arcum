import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  Shield,
  Layers,
  Cpu,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Zap,
  Lock,
  Clock,
  TrendingUp,
  FileText,
  Terminal,
  Activity,
  Search,
} from 'lucide-react';
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from '../data/protocol';

export const DocsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleCopy = (key: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(key);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const sections = [
    { id: 'overview', title: '1. Overview', icon: BookOpen },
    { id: 'getting-started', title: '2. Getting Started', icon: Zap },
    { id: 'everlasting-math', title: '3. Everlasting Math & ODE', icon: Activity },
    { id: 'shield', title: '4. 1-Click Shield Protection', icon: Shield },
    { id: 'writer-pool', title: '5. Writer Pool & Queues', icon: Layers },
    { id: 'twap-guard', title: '6. Uniswap V3 TWAP Reference', icon: Lock },
    { id: 'agent-mcp', title: '7. AI Agents & MCP Tooling', icon: Cpu },
    { id: 'contracts', title: '8. Contract Addresses', icon: Code2 },
    { id: 'prospectus', title: '9. The Prospectus & Risk', icon: FileText },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner: Network Mode & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-white/[0.08] mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-arcum-cyan/10 text-arcum-cyan border border-arcum-cyan/30">
              <span className="w-1.5 h-1.5 rounded-full bg-arcum-cyan animate-pulse" />
              Robinhood Chain Ecosystem
            </span>
            <span className="stamp-badge px-2 py-0.5 rounded bg-white/5 text-arcum-muted border border-white/10 text-[10px]">
              EVM Cancun • 0.8.28
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Arcum Documentation
          </h1>
          <p className="text-sm text-arcum-muted mt-1 max-w-2xl">
            Technical architecture, quantitative specifications, and smart contract references for Everlasting Options on Robinhood Chain.
          </p>
        </div>

        {/* Network Switcher (from asterrapools.tech pattern) */}
        <div className="flex items-center p-1 rounded-xl bg-arcum-surface border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setSelectedNetwork('mainnet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              selectedNetwork === 'mainnet'
                ? 'bg-arcum-cyan/20 text-arcum-cyan border border-arcum-cyan/40 shadow-sm'
                : 'text-arcum-muted hover:text-white'
            }`}
          >
            Mainnet (4663)
          </button>
          <button
            onClick={() => setSelectedNetwork('testnet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              selectedNetwork === 'testnet'
                ? 'bg-arcum-cyan/20 text-arcum-cyan border border-arcum-cyan/40 shadow-sm'
                : 'text-arcum-muted hover:text-white'
            }`}
          >
            Testnet (46630)
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Quick Topics Bar (< lg) */}
      <div className="lg:hidden overflow-x-auto scrollbar-none flex items-center gap-2 pb-4 mb-2 -mx-4 px-4">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => {
                setActiveSection(sec.id);
                document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? 'bg-arcum-cyan/20 text-arcum-cyan border border-arcum-cyan/40 font-semibold shadow-sm'
                  : 'bg-arcum-surface/80 text-arcum-muted hover:text-white border border-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sticky Left Sidebar Navigation (>= lg) */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 space-y-2 p-3 rounded-2xl prospectus-card">
            {/* Instant Search Bar */}
            <div className="relative px-1 pt-1">
              <Search className="w-3.5 h-3.5 text-arcum-muted absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search docs & topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-arcum-card/70 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-arcum-muted focus:outline-none focus:border-arcum-cyan/50 font-mono transition-colors"
              />
            </div>

            <div className="px-3 pt-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-arcum-muted flex justify-between items-center">
              <span>Table of Contents</span>
              {searchQuery && (
                <span className="text-arcum-cyan text-[9px] cursor-pointer" onClick={() => setSearchQuery('')}>
                  Clear
                </span>
              )}
            </div>
            {sections
              .filter((sec) =>
                sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                sec.id.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setActiveSection(sec.id);
                      document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-arcum-cyan/15 text-arcum-cyan border border-arcum-cyan/30'
                        : 'text-arcum-muted hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{sec.title}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 opacity-60 transition-transform ${isActive ? 'translate-x-0.5' : ''}`} />
                  </button>
                );
              })}

            <div className="pt-4 mt-4 border-t border-white/[0.08] px-3">
              <a
                href={CHAIN_CONFIG.blockExplorer}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-[11px] font-mono text-arcum-muted hover:text-arcum-cyan transition-colors"
              >
                <span>Explorer (Chain 4663)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-3 space-y-12">
          {/* Section 1: Overview */}
          <section id="overview" className="prospectus-card rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-arcum-cyan text-xs font-mono font-semibold uppercase tracking-wider">
              <BookOpen className="w-4 h-4" /> Section 1
            </div>
            <h2 className="text-2xl font-bold text-white">Overview: Everlasting Options on Robinhood Chain</h2>
            <p className="text-sm text-arcum-muted leading-relaxed">
              Arcum is the institutional-grade everlasting options protocol native to <strong className="text-white">Robinhood Chain (Chain ID: 4663)</strong>. 
              Unlike legacy derivatives that expire on arbitrary Fridays, Arcum everlasting options never expire. Instead, market pricing is tethered to spot prices 
              through continuous in-kind funding decay governed by a closed-form Euler-Cauchy ODE model.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-arcum-card/60 border border-white/5">
                <span className="text-xs font-mono text-arcum-muted">Settlement Token</span>
                <p className="text-lg font-bold text-white mt-1">USDG</p>
                <span className="text-[11px] text-arcum-muted">Native stablecoin (6 decimals)</span>
              </div>
              <div className="p-4 rounded-xl bg-arcum-card/60 border border-white/5">
                <span className="text-xs font-mono text-arcum-muted">EVM Architecture</span>
                <p className="text-lg font-bold text-arcum-cyan mt-1">Cancun (EIP-1153)</p>
                <span className="text-[11px] text-arcum-muted">TSTORE / TLOAD Reentrancy</span>
              </div>
              <div className="p-4 rounded-xl bg-arcum-card/60 border border-white/5">
                <span className="text-xs font-mono text-arcum-muted">Protocol Base Fee</span>
                <p className="text-lg font-bold text-emerald-400 mt-1">3 bps (0.03%)</p>
                <span className="text-[11px] text-arcum-muted">Lowest options fee in Web3</span>
              </div>
            </div>
          </section>

          {/* Section 2: Getting Started */}
          <section id="getting-started" className="prospectus-card rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-arcum-cyan text-xs font-mono font-semibold uppercase tracking-wider">
              <Zap className="w-4 h-4" /> Section 2
            </div>
            <h2 className="text-2xl font-bold text-white">Getting Started on Robinhood Chain</h2>
            <p className="text-sm text-arcum-muted leading-relaxed">
              Connect your Web3 wallet (MetaMask, Rabby, Coinbase Wallet) or execute via automated AI Agents through the Model Context Protocol (MCP).
            </p>

            <div className="p-4 rounded-xl bg-arcum-dark/80 border border-white/10 font-mono text-xs text-arcum-text space-y-2">
              <div className="flex justify-between text-arcum-muted pb-1 border-b border-white/5">
                <span>Network Parameter</span>
                <span>Value</span>
              </div>
              <div className="flex justify-between">
                <span className="text-arcum-muted">Network Name:</span>
                <span className="text-white">Robinhood Chain Mainnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-arcum-muted">Chain ID:</span>
                <span className="text-arcum-cyan">4663</span>
              </div>
              <div className="flex justify-between">
                <span className="text-arcum-muted">RPC Endpoint:</span>
                <span className="text-white">https://rpc.robinhoodchain.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-arcum-muted">Currency Symbol:</span>
                <span className="text-white">ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-arcum-muted">Block Explorer:</span>
                <a href={CHAIN_CONFIG.blockExplorer} target="_blank" rel="noreferrer" className="text-arcum-cyan hover:underline">
                  {CHAIN_CONFIG.blockExplorer}
                </a>
              </div>
            </div>
          </section>

          {/* Section 3: Everlasting Math */}
          <section id="everlasting-math" className="prospectus-card rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-arcum-cyan text-xs font-mono font-semibold uppercase tracking-wider">
              <Activity className="w-4 h-4" /> Section 3
            </div>
            <h2 className="text-2xl font-bold text-white">Everlasting Math: Closed-Form ODE Solution</h2>
            <p className="text-sm text-arcum-muted leading-relaxed">
              Arcum implements the exact Euler-Cauchy ODE under continuous geometric Brownian motion:
            </p>

            <div className="p-4 rounded-xl bg-arcum-dark/90 border border-arcum-cyan/30 glow-cyan-subtle font-mono text-xs text-arcum-cyan space-y-2 overflow-x-auto">
              <p>1/2 * σ² * S² * V''(S) - (1/τ) * V(S) + (1/τ) * Payoff(S) = 0</p>
              <p className="text-arcum-muted">// Characteristic parameter alpha:</p>
              <p>α = (1 + sqrt(1 + 8 / (σ² * τ))) / 2</p>
              <p className="text-arcum-muted">// Call Option closed-form price:</p>
              <p>If S ≤ K: V_call = (K / (2*α - 1)) * (S / K)^α</p>
              <p>If S &gt; K: V_call = (S - K) + (K / (2*α - 1)) * (K / S)^(α - 1)</p>
              <p className="text-arcum-muted">// Put-Call Parity:</p>
              <p>V_put = V_call - (S - K)</p>
            </div>

            <p className="text-xs text-arcum-muted">
              Differential verification across Solidity, Python, and TypeScript is guaranteed at <strong>0.00e+00</strong> divergence.
            </p>
          </section>

          {/* Section 4: 1-Click Shield */}
          <section id="shield" className="prospectus-card rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-arcum-cyan text-xs font-mono font-semibold uppercase tracking-wider">
              <Shield className="w-4 h-4" /> Section 4
            </div>
            <h2 className="text-2xl font-bold text-white">1-Click Automated Shield Protection</h2>
            <p className="text-sm text-arcum-muted leading-relaxed">
              Shield is designed for equity stock token holders (NVDA, TSLA, AAPL, AMZN, MSFT, GOOGL). 
              With a single transaction, the engine computes optimal Weekly Put strikes below spot price, transfers USDG premium to the Writer Pool, 
              and mints protective put tokens straight to the user.
            </p>
            <div className="p-3 rounded-xl bg-arcum-card/40 border border-white/5 text-xs text-arcum-muted space-y-1">
              <p className="font-semibold text-white">Default Shield Parameters:</p>
              <p>• Strike Selection: 5% or 10% below spot</p>
              <p>• Funding Speed: Weekly (τ = 604,800 seconds)</p>
              <p>• Max Cost Slippage: User-specified cap in USDG</p>
            </div>
          </section>

          {/* Section 5: Writer Pool */}
          <section id="writer-pool" className="prospectus-card rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-arcum-cyan text-xs font-mono font-semibold uppercase tracking-wider">
              <Layers className="w-4 h-4" /> Section 5
            </div>
            <h2 className="text-2xl font-bold text-white">USDG Writer Pool & Withdrawal Queue</h2>
            <p className="text-sm text-arcum-muted leading-relaxed">
              The counterparty to all options is the <strong>WriterPool</strong> (ERC-4626 vault with 12-decimal shares). 
              LPs earn option premiums, trade fees, and norm decay holding yield.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-arcum-card/50 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs">
                  <Clock className="w-4 h-4" /> 24-Hour Deposit Lock
                </div>
                <p className="text-xs text-arcum-muted">
                  New deposits are locked for 24 hours to prevent flash-deposit MEV extraction before known equity events.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-arcum-card/50 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-arcum-cyan font-mono text-xs">
                  <Lock className="w-4 h-4" /> 72-Hour Withdrawal Queue
                </div>
                <p className="text-xs text-arcum-muted">
                  Withdrawals enter a 72-hour queue and settle at claim-time NAV, preventing front-running during volatile sessions.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: TWAP Reference */}
          <section id="twap-guard" className="prospectus-card rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-arcum-cyan text-xs font-mono font-semibold uppercase tracking-wider">
              <Lock className="w-4 h-4" /> Section 6
            </div>
            <h2 className="text-2xl font-bold text-white">Uniswap V3 TWAP Anti-Sandwich Protection</h2>
            <p className="text-sm text-arcum-muted leading-relaxed">
              Adapted from upstream reference architecture (<code className="text-arcum-cyan">UniswapV3TwapReference.sol</code>), 
              the protocol protects automated spot delta hedging against sandwich attacks.
            </p>
            <div className="p-4 rounded-xl bg-arcum-dark/90 border border-white/10 font-mono text-xs text-arcum-muted space-y-1">
              <p className="text-white">// Q128.128 Binary Exponentiation:</p>
              <p>meanTick = (tickCumulatives[1] - tickCumulatives[0]) / window</p>
              <p>priceX128 = priceX128AtTick(meanTick) // 1.0001^tick</p>
              <p>TWAP = mulDiv(priceX128, 1e30, 1 &lt;&lt; 128)</p>
            </div>
          </section>

          {/* Section 7: AI Agents */}
          <section id="agent-mcp" className="prospectus-card rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-arcum-cyan text-xs font-mono font-semibold uppercase tracking-wider">
              <Cpu className="w-4 h-4" /> Section 7
            </div>
            <h2 className="text-2xl font-bold text-white">AI Agents, MCP Tool Server & ERC-4337</h2>
            <p className="text-sm text-arcum-muted leading-relaxed">
              Arcum provides native support for autonomous AI trading agents. Through <code className="text-arcum-cyan">AgentRouter.sol</code>, 
              users set non-custodial trading policies allowing agents to trade within strict budgets without custody of collateral.
            </p>
            <div className="p-4 rounded-xl bg-arcum-dark/90 border border-white/10 font-mono text-xs space-y-1 text-arcum-muted">
              <p className="text-arcum-cyan font-bold">// MCP Tool Server Endpoints:</p>
              <p>• arcum_quote_option: Fetch closed-form quote</p>
              <p>• arcum_execute_buy: Delegate-buy through AgentRouter</p>
              <p>• arcum_auto_shield: Execute 1-click portfolio hedge</p>
              <p>• arcum_pool_stats: Telemetry and NAV healthcheck</p>
            </div>
          </section>

          {/* Section 8: Contracts */}
          <section id="contracts" className="prospectus-card rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-arcum-cyan text-xs font-mono font-semibold uppercase tracking-wider">
              <Code2 className="w-4 h-4" /> Section 8
            </div>
            <h2 className="text-2xl font-bold text-white">Smart Contract Addresses (Chain 4663)</h2>
            <p className="text-sm text-arcum-muted leading-relaxed">
              All contracts are compiled with Solidity 0.8.28 (Cancun EVM) and verified on Sourcify and Robinhood Chain explorer.
            </p>

            <div className="space-y-2">
              {Object.entries(CONTRACT_ADDRESSES).map(([name, addr]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 rounded-xl bg-arcum-card/40 border border-white/5 font-mono text-xs"
                >
                  <div>
                    <span className="text-white font-medium capitalize">{name}</span>
                    <span className="text-[10px] text-arcum-muted ml-2">{addr}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(name, addr)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-arcum-muted hover:text-white transition-colors"
                  >
                    {copiedAddress === name ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Section 9: The Prospectus */}
          <section id="prospectus" className="prospectus-card rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-arcum-cyan text-xs font-mono font-semibold uppercase tracking-wider">
              <FileText className="w-4 h-4" /> Section 9
            </div>
            <h2 className="text-2xl font-bold text-white">The Prospectus: Institutional Disclosures & Risk Matrix</h2>
            <p className="text-sm text-arcum-muted leading-relaxed">
              Arcum Everlasting Options represent synthetic decentralized derivative contracts. By trading, users acknowledge:
            </p>
            <div className="space-y-2 text-xs text-arcum-muted leading-relaxed">
              <p>1. <strong>In-Kind Norm Decay:</strong> Holding options incurs ongoing funding decay proportional to time value / tau. If underlying prices stay flat, option value slowly decays toward intrinsic value.</p>
              <p>2. <strong>NYSE Session Regimes:</strong> Orders during pre/post-market or holidays are subject to wider spreads or queued execution.</p>
              <p>3. <strong>Smart Contract Risk:</strong> While audited and verified with stateful invariant fuzzing, smart contract execution carries inherent blockchain risk.</p>
            </div>
            <div className="pt-2">
              <span className="stamp-badge px-3 py-1 rounded bg-arcum-cyan/10 text-arcum-cyan border border-arcum-cyan/30">
                Official Robinhood Chain Protocol Prospectus • Verifiable on Sourcify
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
