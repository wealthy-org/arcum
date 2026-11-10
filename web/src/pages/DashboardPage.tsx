import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Layers,
  Bot,
  Activity,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Wallet,
  Lock,
  Copy,
  Terminal,
  Check,
  Sparkles,
  Compass,
  X,
} from 'lucide-react';
import { StockInfo, Speed, OptionSide, UserPosition, WriterPoolStats, AgentPolicy } from '../types';
import { quoteOption, calculateScenarioPnL } from '../utils/pricing';
import { INITIAL_POOL_STATS, INITIAL_AGENT_POLICY, CHAIN_CONFIG, CONTRACT_ADDRESSES } from '../data/protocol';

interface DashboardPageProps {
  stocks: StockInfo[];
  selectedStock: StockInfo;
  onSelectStock: (stock: StockInfo) => void;
  walletConnected: boolean;
  onConnectWallet: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNavigate?: (route: string, tab?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stocks,
  selectedStock,
  onSelectStock,
  walletConnected,
  onConnectWallet,
  activeTab: externalTab,
  onTabChange,
  onNavigate,
}) => {
  const [internalTab, setInternalTab] = useState<string>('trade');
  const activeTab = externalTab !== undefined ? externalTab : internalTab;

  const setActiveTab = (tab: string) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [selectedSide, setSelectedSide] = useState<OptionSide>('UP');
  const [selectedSpeed, setSelectedSpeed] = useState<Speed>('DAILY');
  const [selectedStrike, setSelectedStrike] = useState<number>(selectedStock.price);

  useEffect(() => {
    setSelectedStrike(selectedStock.price);
  }, [selectedStock.symbol, selectedStock.price]);
  const [tradeUnits, setTradeUnits] = useState<number>(10);
  const [showBuyModal, setShowBuyModal] = useState<boolean>(false);
  const [buyStep, setBuyStep] = useState<'idle' | 'approving' | 'approved' | 'buying' | 'success'>('idle');

  // What-If Scenario State
  const [scenarioDays, setScenarioDays] = useState<number>(3);
  const [targetMovePct, setTargetMovePct] = useState<number>(5); // default +5% move
  const [shieldPctBelow, setShieldPctBelow] = useState<number>(5); // 1-Click Shield % below spot

  // Writer Pool state
  const [poolStats, setPoolStats] = useState<WriterPoolStats>(INITIAL_POOL_STATS);
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [withdrawShares, setWithdrawShares] = useState<number>(500);

  // Sync with live on-chain / API pool telemetry (supports relative URL on Vercel or localhost:3002)
  useEffect(() => {
    const fetchPoolTelemetry = async () => {
      try {
        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const endpoints = isLocalhost
          ? ['http://localhost:3002/v1/pool', '/v1/pool']
          : ['/v1/pool', 'http://localhost:3002/v1/pool'];

        for (const ep of endpoints) {
          try {
            const res = await fetch(ep);
            if (res.ok) {
              const data = await res.json();
              setPoolStats((prev) => ({
                ...prev,
                navUsdg: data.navUsdg ?? prev.navUsdg,
                conservativeEntryNav: data.conservativeEntryNav ?? prev.conservativeEntryNav,
                navPerShare: data.navPerShare ?? prev.navPerShare,
                capacityUtilizationPct: data.capacityUtilizationPct ?? prev.capacityUtilizationPct,
              }));
              break;
            }
          } catch {
            // try next endpoint
          }
        }
      } catch {
        // Fallback to INITIAL_POOL_STATS seamlessly
      }
    };
    fetchPoolTelemetry();
  }, []);

  // In-App Toast Notification System (replaces disruptive window.alert)
  interface ToastItem {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success'
  ) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // User Positions Mock State
  const [positions, setPositions] = useState<UserPosition[]>([
    {
      id: 'pos-1',
      seriesId: '0xNVDA_UP_145_D',
      stock: 'NVDA',
      isCall: true,
      speed: 'DAILY',
      strike: 145.0,
      rawTokens: 50.0,
      norm: 0.942,
      effectiveUnits: 47.1,
      entryPriceUsdg: 4.85,
      currentValueUsdg: 282.6,
      pnlUsdg: 39.1,
      pnlPct: 16.05,
      boughtAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'pos-2',
      seriesId: '0xTSLA_DOWN_240_W',
      stock: 'TSLA',
      isCall: false,
      speed: 'WEEKLY',
      strike: 240.0,
      rawTokens: 25.0,
      norm: 0.985,
      effectiveUnits: 24.62,
      entryPriceUsdg: 8.20,
      currentValueUsdg: 189.5,
      pnlUsdg: -15.5,
      pnlPct: -7.56,
      boughtAt: Date.now() - 86400000 * 3,
    }
  ]);

  // Agent Policy
  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy>(INITIAL_AGENT_POLICY);
  const [mcpCopied, setMcpCopied] = useState<boolean>(false);

  // Guided Terminal Tour State
  const [showTour, setShowTour] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('arcum-tour-completed') !== 'true';
    }
    return true;
  });
  const [tourStep, setTourStep] = useState<number>(1);

  const handleDismissTour = () => {
    setShowTour(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('arcum-tour-completed', 'true');
    }
  };

  // Quote computation
  const activeIvBps = selectedSpeed === 'DAILY' ? selectedStock.ivDailyBps : selectedStock.ivWeeklyBps;
  const currentQuote = quoteOption(
    selectedStock.price,
    selectedStrike,
    activeIvBps,
    selectedSpeed,
    selectedSide === 'UP',
    tradeUnits
  );

  // What-If Scenario Calculation
  const projectedSpot = selectedStock.price * (1 + targetMovePct / 100);
  const scenario = calculateScenarioPnL(
    projectedSpot,
    selectedStrike,
    activeIvBps,
    selectedSpeed,
    selectedSide === 'UP',
    tradeUnits,
    scenarioDays,
    currentQuote.totalCostUsdg
  );

  // Strikes list around current price
  const strikeInterval = selectedStock.price > 300 ? 10 : selectedStock.price > 100 ? 5 : 2.5;
  const baseStrike = Math.round(selectedStock.price / strikeInterval) * strikeInterval;
  const strikes = [
    baseStrike - strikeInterval * 2,
    baseStrike - strikeInterval,
    baseStrike,
    baseStrike + strikeInterval,
    baseStrike + strikeInterval * 2,
  ];

  const handleExecuteBuy = () => {
    setBuyStep('approving');
    setTimeout(() => {
      setBuyStep('approved');
      setTimeout(() => {
        setBuyStep('buying');
        setTimeout(() => {
          setBuyStep('success');
          // Add to positions
          const newPos: UserPosition = {
            id: `pos-${Date.now()}`,
            seriesId: `0x${selectedStock.symbol}_${selectedSide}_${selectedStrike}_${selectedSpeed[0]}`,
            stock: selectedStock.symbol,
            isCall: selectedSide === 'UP',
            speed: selectedSpeed,
            strike: selectedStrike,
            rawTokens: tradeUnits,
            norm: 1.0,
            effectiveUnits: tradeUnits,
            entryPriceUsdg: currentQuote.markPriceUsdg,
            currentValueUsdg: currentQuote.totalCostUsdg,
            pnlUsdg: 0,
            pnlPct: 0,
            boughtAt: Date.now(),
          };
          setPositions([newPos, ...positions]);
          showToast(
            'Order Filled On-Chain',
            `Minted ${tradeUnits} ${selectedStock.symbol} ${selectedSide === 'UP' ? 'Up' : 'Down'} options at $${currentQuote.totalCostUsdg.toFixed(2)} USDG.`,
            'success'
          );
        }, 1200);
      }, 800);
    }, 1000);
  };

  const handleClosePosition = (posId: string) => {
    const pos = positions.find((p) => p.id === posId);
    if (!pos) return;
    setPositions((prev) => prev.filter((p) => p.id !== posId));
    showToast(
      'Position Closed & Settled',
      `Sold ${pos.effectiveUnits.toFixed(2)} ${pos.stock} ${pos.isCall ? 'UP' : 'DOWN'} at market bid of $${pos.currentValueUsdg.toFixed(2)} USDG. Proceeds credited to wallet.`,
      'success'
    );
  };

  const handleExecuteShield = () => {
    showToast(
      'Shield Protection Active',
      `100% Capital Floor established for ${selectedStock.symbol}. Optimal weekly put hedge successfully acquired via ArcumEngine.sol.`,
      'success'
    );
  };

  const handleDepositPool = () => {
    setPoolStats((prev) => ({
      ...prev,
      navUsdg: prev.navUsdg + depositAmount,
      conservativeEntryNav: prev.conservativeEntryNav + depositAmount * 0.999,
    }));
    const mintedShares = (depositAmount / poolStats.navPerShare).toFixed(2);
    showToast(
      'Liquidity Underwritten',
      `Deposited $${depositAmount.toLocaleString()} USDG to Writer Pool. Received ${mintedShares} 12-decimal Virtual Shares.`,
      'success'
    );
  };

  const handleWithdrawRequest = () => {
    const ticketId = Math.floor(100000 + Math.random() * 900000);
    showToast(
      'Withdrawal Ticket Queued',
      `Ticket #${ticketId} created for ${withdrawShares} shares. 72-hour queue active with pro-rata NAV settlement at maturity.`,
      'info'
    );
  };

  const handleTogglePolicy = () => {
    const newRevoked = !agentPolicy.revoked;
    setAgentPolicy({ ...agentPolicy, revoked: newRevoked });
    showToast(
      newRevoked ? 'Policy Authority Revoked' : 'Policy Restored',
      newRevoked
        ? 'AgentRouter.sol has revoked autonomous trading authority immediately on-chain.'
        : 'Autonomous trading policy restored under ERC-7730 gas budget and whitelist constraints.',
      newRevoked ? 'warning' : 'success'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6 flex flex-col md:flex-row gap-6 min-h-[calc(100vh-140px)]">
      {/* 1. Left Sidebar Rail (Institutional Financial Navigation - Option A) */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 rounded-2xl bg-arcum-surface border border-arcum-border p-4 space-y-6 self-start sticky top-20 shadow-sm">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-arcum-border pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-arcum-cyan" />
            <span className="font-display font-bold text-xs uppercase tracking-wider text-white">Arcum Workspace</span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-arcum-card text-arcum-cyan border border-arcum-border font-semibold">4663</span>
        </div>

        {/* Section 1: Core Trading & Vault */}
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-arcum-muted px-2.5 mb-1.5 font-semibold">
            Trading & Vaults
          </div>
          {[
            { id: 'trade', label: 'Trade Options', icon: TrendingUp },
            { id: 'shield', label: '1-Click Shield', icon: Shield },
            { id: 'positions', label: 'Positions', icon: Layers, badge: positions.length },
            { id: 'pool', label: 'Writer Pool', icon: Lock },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-arcum-cyan/15 text-arcum-cyan border border-arcum-cyan/35 font-bold shadow-sm'
                    : 'text-arcum-muted hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${active ? 'bg-arcum-cyan text-arcum-dark' : 'bg-arcum-card text-arcum-muted border border-arcum-border'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section 2: Automation & Telemetry */}
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-arcum-muted px-2.5 mb-1.5 font-semibold">
            Automation & Logs
          </div>
          {[
            { id: 'agents', label: 'AI Agents (MCP)', icon: Bot },
            { id: 'activity', label: 'Protocol Activity', icon: Activity },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-arcum-cyan/15 text-arcum-cyan border border-arcum-cyan/35 font-bold shadow-sm'
                    : 'text-arcum-muted hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section 3: Resources & Tools */}
        <div className="space-y-1 border-t border-arcum-border pt-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-arcum-muted px-2.5 mb-1.5 font-semibold">
            Resources & Tools
          </div>
          {[
            { id: 'settings', label: 'Settings', icon: Settings, isTab: true },
            { id: 'docs', label: 'Documentation', icon: HelpCircle, route: 'docs' },
            { id: 'contracts', label: 'Verified Contracts', icon: ExternalLink, route: 'contracts' },
            { id: 'exit', label: 'Emergency Exit', icon: AlertCircle, route: 'exit' },
          ].map((item) => {
            const Icon = item.icon;
            const active = item.isTab && activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isTab) {
                    setActiveTab(item.id);
                  } else if (item.route && onNavigate) {
                    onNavigate(item.route);
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-arcum-cyan/15 text-arcum-cyan border border-arcum-cyan/35 font-bold'
                    : 'text-arcum-muted hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="mt-auto border-t border-arcum-border pt-3 font-mono text-[11px] space-y-2">
          <div className="flex items-center justify-between text-arcum-muted">
            <span>Network:</span>
            <span className="text-white font-bold">Robinhood 4663</span>
          </div>
          <div className="flex items-center justify-between text-arcum-muted">
            <span>Settlement:</span>
            <span className="text-arcum-cyan font-bold">USDG (6 dp)</span>
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace Content Area */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Mobile Tab Chip Navigation (< 768px) */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {[
            { id: 'trade', label: 'Trade', icon: TrendingUp },
            { id: 'shield', label: 'Shield', icon: Shield },
            { id: 'positions', label: 'Positions', icon: Layers, badge: positions.length },
            { id: 'pool', label: 'Writer Pool', icon: Lock },
            { id: 'agents', label: 'AI Agents', icon: Bot },
            { id: 'activity', label: 'Activity', icon: Activity },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono shrink-0 transition-all ${
                  active
                    ? 'bg-arcum-cyan/15 text-arcum-cyan border border-arcum-cyan/35 font-bold'
                    : 'bg-arcum-surface border border-arcum-border text-arcum-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Market / Asset Context Strip (Top of Main Area) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-arcum-surface border border-arcum-border p-2.5 sm:p-3 rounded-2xl shadow-sm">
          {/* Asset selector chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {stocks.map((stock) => {
              const isSel = selectedStock.symbol === stock.symbol;
              return (
                <button
                  key={stock.symbol}
                  onClick={() => onSelectStock(stock)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 ${
                    isSel
                      ? 'bg-arcum-card border border-arcum-cyan text-white shadow-sm font-bold'
                      : 'bg-arcum-surface hover:bg-arcum-card/60 text-arcum-muted hover:text-white border border-transparent'
                  }`}
                >
                  <span className="font-bold font-sans text-white">{stock.symbol}</span>
                  <span className="text-arcum-cyan font-tabular">${stock.price.toFixed(2)}</span>
                  <span className={`text-[10px] ${stock.change24h >= 0 ? 'text-arcum-up' : 'text-arcum-down'}`}>
                    {stock.change24h >= 0 ? '+' : ''}{stock.change24h}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Context status */}
          <div className="flex items-center gap-3 text-xs font-mono px-3 py-1 bg-arcum-card rounded-xl border border-arcum-border text-arcum-muted shrink-0">
            <span>Session: <strong className="text-arcum-up">REGULAR</strong></span>
            <span>IV: <strong className="text-white">{(activeIvBps / 100).toFixed(0)}%</strong></span>
          </div>
        </div>

      {/* Interactive Guided Terminal Tour (Sally's Anti-Slop Walkthrough) */}
      {showTour && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-arcum-surface via-arcum-surface to-arcum-card border border-arcum-cyan/35 p-5 sm:p-6 shadow-[0_4px_30px_rgba(25,230,255,0.08)] mb-6 animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arcum-cyan/15 text-arcum-cyan border border-arcum-cyan/30 text-xs font-mono font-semibold">
                <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                <span>Protocol Walkthrough — Step {tourStep} of 3</span>
              </div>

              {tourStep === 1 && (
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-arcum-cyan" /> Continuous Everlasting Options (Zero Fixed Expiration)
                  </h3>
                  <p className="text-xs sm:text-sm text-arcum-muted leading-relaxed">
                    Arcum options reference synthetic Stock Tokens (NVDA, TSLA, SPY, QQQ, AAPL) on Robinhood Chain. Choose <strong className="text-arcum-up font-semibold">Up (Call)</strong> for bullish upside or <strong className="text-arcum-down font-semibold">Down (Put)</strong> for downside. You will never experience expiration friction or liquidation risk.
                  </p>
                </div>
              )}

              {tourStep === 2 && (
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-arcum-cyan" /> In-Kind Holding Decay (Norm Factor & Speeds)
                  </h3>
                  <p className="text-xs sm:text-sm text-arcum-muted leading-relaxed">
                    Daily (<span className="font-mono text-white">τ = 86,400s</span>) and Weekly (<span className="font-mono text-white">τ = 604,800s</span>) are continuous funding speeds, not expiry deadlines. Time value is deducted in-kind over elapsed holding time via the series normalization factor (<span className="font-mono text-arcum-cyan">Norm_t</span>).
                  </p>
                </div>
              )}

              {tourStep === 3 && (
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-arcum-cyan" /> 1-Click Shield & USDG Writer Pool Solvency
                  </h3>
                  <p className="text-xs sm:text-sm text-arcum-muted leading-relaxed">
                    Protect stock token portfolios against crash drawdowns with 1 click in the <strong className="text-white font-semibold">Shield</strong> tab. Passive capital providers deposit USDG into the <strong className="text-white font-semibold">Writer Pool</strong> to capture 80% protocol fees, protected by a 72-hour withdrawal queue and 3-layer solvency waterfall.
                  </p>
                </div>
              )}

              {/* Progress and Navigation */}
              <div className="flex items-center gap-3 pt-2">
                {tourStep > 1 && (
                  <button
                    onClick={() => setTourStep(prev => prev - 1)}
                    className="px-3.5 py-1.5 rounded-lg bg-arcum-card border border-arcum-border text-arcum-muted hover:text-white text-xs font-mono transition-all"
                  >
                    Previous
                  </button>
                )}
                {tourStep < 3 ? (
                  <button
                    onClick={() => setTourStep(prev => prev + 1)}
                    className="px-4 py-1.5 rounded-lg bg-arcum-cyan text-arcum-dark text-xs font-mono font-bold hover:brightness-110 shadow-[0_0_15px_rgba(25,230,255,0.3)] transition-all"
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    onClick={handleDismissTour}
                    className="px-4 py-1.5 rounded-lg bg-arcum-up text-arcum-dark text-xs font-mono font-bold hover:brightness-110 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                  >
                    Finish Walkthrough ✓
                  </button>
                )}
                <button
                  onClick={handleDismissTour}
                  className="text-xs text-arcum-muted hover:text-white underline font-mono ml-2 transition-all"
                >
                  Dismiss Guide
                </button>
              </div>
            </div>

            <button
              onClick={handleDismissTour}
              aria-label="Close tour"
              className="text-arcum-muted hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: TRADE OPTIONS */}
      {activeTab === 'trade' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Chain & Strike Selector */}
          <div className="lg:col-span-2 space-y-6">
            {/* Speed & Side Bar */}
            <div className="bg-arcum-surface border border-arcum-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Up / Down Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedSide('UP')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    selectedSide === 'UP'
                      ? 'bg-arcum-up text-arcum-dark up-glow font-bold'
                      : 'bg-arcum-card text-arcum-muted hover:text-white border border-arcum-border'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Up (Call)
                </button>
                <button
                  onClick={() => setSelectedSide('DOWN')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    selectedSide === 'DOWN'
                      ? 'bg-arcum-down text-white down-glow font-bold'
                      : 'bg-arcum-card text-arcum-muted hover:text-white border border-arcum-border'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" /> Down (Put)
                </button>
              </div>

              {/* Speed Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-arcum-muted font-mono">Funding Speed:</span>
                <button
                  onClick={() => setSelectedSpeed('DAILY')}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                    selectedSpeed === 'DAILY'
                      ? 'bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-bold drop-shadow-sm'
                      : 'bg-arcum-card text-arcum-muted hover:text-white border border-arcum-border'
                  }`}
                >
                  Daily (τ=1d)
                </button>
                <button
                  onClick={() => setSelectedSpeed('WEEKLY')}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                    selectedSpeed === 'WEEKLY'
                      ? 'bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-bold drop-shadow-sm'
                      : 'bg-arcum-card text-arcum-muted hover:text-white border border-arcum-border'
                  }`}
                >
                  Weekly (τ=7d)
                </button>
              </div>
            </div>

            {/* Strikes Matrix */}
            <div className="doppelrand-shell">
              <div className="doppelrand-core overflow-hidden">
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-arcum-border flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-base font-heading">Select Strike Price</h3>
                    <p className="text-xs text-arcum-muted">Everlasting options hold no expiry date. Holding cost continuously updates effective payout.</p>
                  </div>
                  <div className="text-xs font-mono text-arcum-cyan px-2.5 py-1 rounded-full bg-arcum-gold/10 border border-arcum-gold/20 shrink-0">
                    IV {(activeIvBps / 100).toFixed(0)}%
                  </div>
                </div>

                <div className="divide-y divide-arcum-border font-mono text-xs">
                {strikes.map((strikeVal) => {
                  const isAtm = strikeVal === baseStrike;
                  const isSelected = selectedStrike === strikeVal;
                  const q = quoteOption(
                    selectedStock.price,
                    strikeVal,
                    activeIvBps,
                    selectedSpeed,
                    selectedSide === 'UP',
                    1
                  );

                  return (
                    <div
                      key={strikeVal}
                      onClick={() => setSelectedStrike(strikeVal)}
                      className={`px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-arcum-card border-l-4 border-l-arcum-cyan'
                          : 'hover:bg-arcum-card/50'
                      }`}
                    >
                      <div className="flex items-center justify-between sm:justify-start gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm sm:text-base text-white font-sans">${strikeVal.toFixed(2)}</span>
                          {isAtm && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-arcum-cyan/15 text-arcum-cyan border border-arcum-cyan/25 font-bold">
                              ATM
                            </span>
                          )}
                        </div>
                        <span className="text-arcum-muted text-xs">
                          Delta: <span className="text-white font-semibold">{q.delta.toFixed(3)}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                        <div className="text-left sm:text-right">
                          <div className="text-[10px] text-arcum-muted">Mark Price</div>
                          <div className="font-bold text-white font-tabular text-xs sm:text-sm">${q.markPriceUsdg.toFixed(3)} USDG</div>
                        </div>
                        <div className="text-center sm:text-right">
                          <div className="text-[10px] text-arcum-muted">Est. Daily Decay</div>
                          <div className="text-amber-700 dark:text-amber-400 font-tabular text-xs sm:text-sm">-${q.dailyDecayUsdg.toFixed(3)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStrike(strikeVal);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 active:scale-95 ${
                            isSelected
                              ? 'bg-arcum-cyan text-arcum-dark font-bold shadow-sm'
                              : 'bg-arcum-surface border border-arcum-border text-arcum-muted hover:text-white'
                          }`}
                        >
                          {isSelected ? 'Active' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>

            {/* Interactive What-If PnL Simulator Card (Balanced in Left Column) */}
            <div className="doppelrand-shell">
              <div className="doppelrand-core p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-arcum-border pb-3">
                  <div className="flex items-center gap-2 text-white font-bold text-sm font-heading">
                    <span className="w-2 h-2 rounded-full bg-arcum-cyan shadow-[0_0_12px_rgba(25,230,255,0.4)]" />
                    What-If PnL & Decay Simulator
                  </div>
                  <span className="text-[10px] text-arcum-muted font-mono px-2 py-0.5 rounded-full bg-arcum-card border border-arcum-border">
                    Continuous Norm Decay
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Slider 1: Price Move */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-arcum-muted">Target Move:</span>
                      <span className={`font-bold ${targetMovePct >= 0 ? 'text-arcum-up' : 'text-arcum-down'}`}>
                        {targetMovePct >= 0 ? '+' : ''}{targetMovePct}% (${projectedSpot.toFixed(2)})
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-25"
                      max="35"
                      value={targetMovePct}
                      onChange={(e) => setTargetMovePct(parseInt(e.target.value))}
                      className="w-full accent-arcum-cyan h-1.5 bg-arcum-card rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Slider 2: Holding Horizon */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-arcum-muted">Holding Horizon:</span>
                      <span className="text-white font-bold">{scenarioDays} Days</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="14"
                      value={scenarioDays}
                      onChange={(e) => setScenarioDays(parseInt(e.target.value))}
                      className="w-full accent-arcum-cyan h-1.5 bg-arcum-card rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Quick Scenario Presets */}
                <div className="pt-1">
                  <div className="text-[10px] text-arcum-muted font-mono uppercase tracking-wider mb-1.5 font-semibold">
                    Quick Presets:
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => { setTargetMovePct(8); setScenarioDays(1); }}
                      className="px-2.5 py-1.5 rounded-lg bg-arcum-card border border-arcum-border hover:border-arcum-up/50 hover:bg-arcum-up/10 text-arcum-up text-center transition-all truncate font-semibold"
                    >
                      Beat (+8%, 1d)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTargetMovePct(-10); setScenarioDays(2); }}
                      className="px-2.5 py-1.5 rounded-lg bg-arcum-card border border-arcum-border hover:border-arcum-down/50 hover:bg-arcum-down/10 text-arcum-down text-center transition-all truncate font-semibold"
                    >
                      Drop (-10%, 2d)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTargetMovePct(3); setScenarioDays(7); }}
                      className="px-2.5 py-1.5 rounded-lg bg-arcum-card border border-arcum-border hover:border-arcum-cyan/50 hover:bg-arcum-cyan/10 text-arcum-cyan text-center transition-all truncate font-semibold"
                    >
                      Drift (+3%, 7d)
                    </button>
                  </div>
                </div>

                {/* Interactive SVG Payoff Curve vs Continuous Norm Decay */}
                <div className="p-3.5 rounded-xl bg-arcum-card border border-arcum-border space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-arcum-muted font-semibold">Option Payoff vs Continuous Decay Curve</span>
                    <span className="text-arcum-cyan font-bold">Euler-Cauchy ODE</span>
                  </div>
                  <svg viewBox="0 0 320 70" className="w-full h-16 overflow-visible" aria-label="Payoff Curve vs Norm Decay">
                    <line x1="0" y1="55" x2="320" y2="55" stroke="currentColor" className="text-arcum-border" strokeDasharray="3 3" />
                    <line x1="160" y1="5" x2="160" y2="65" stroke="currentColor" className="text-arcum-border" strokeDasharray="3 3" />
                    <text x="165" y="68" fill="currentColor" className="text-[9px] fill-arcum-muted font-mono">K (${selectedStrike.toFixed(0)})</text>
                    {selectedSide === 'UP' ? (
                      <>
                        <path d="M 20 55 L 160 55 L 300 12" fill="none" stroke="currentColor" className="text-white/30" strokeWidth="1.5" strokeDasharray="3 3" />
                        <path d="M 20 53 Q 160 48 300 10" fill="none" stroke="#19E6FF" strokeWidth="2.5" />
                        <path d={`M 20 ${53 + scenarioDays * 0.7} Q 160 ${49 + scenarioDays * 0.9} 300 ${12 + scenarioDays * 1.8}`} fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="4 2" />
                      </>
                    ) : (
                      <>
                        <path d="M 20 12 L 160 55 L 300 55" fill="none" stroke="currentColor" className="text-white/30" strokeWidth="1.5" strokeDasharray="3 3" />
                        <path d="M 20 10 Q 160 48 300 53" fill="none" stroke="#19E6FF" strokeWidth="2.5" />
                        <path d={`M 20 ${12 + scenarioDays * 1.8} Q 160 ${49 + scenarioDays * 0.9} 300 ${53 + scenarioDays * 0.7}`} fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="4 2" />
                      </>
                    )}
                  </svg>
                  <div className="flex items-center justify-between text-[10px] font-mono text-arcum-muted pt-1">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-arcum-cyan" /><span>Day 0 Mark V(S)</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-arcum-up" /><span>Day {scenarioDays} Effective</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-white/40" /><span>Payoff Intrinsic</span></div>
                  </div>
                </div>

                {/* Projected PnL Results Box */}
                <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
                  scenario.netPnlUsdg >= 0
                    ? 'bg-arcum-up/10 border-arcum-up/30 text-arcum-up'
                    : 'bg-arcum-down/10 border-arcum-down/30 text-arcum-down'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Projected Net PnL:</span>
                    <span className="text-base font-bold font-tabular">
                      {scenario.netPnlUsdg >= 0 ? '+' : ''}${scenario.netPnlUsdg.toFixed(2)} USDG
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-arcum-muted">Projected Net ROI:</span>
                    <span className="font-bold font-tabular">
                      {scenario.roiPct >= 0 ? '+' : ''}{scenario.roiPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-arcum-muted pt-1 border-t border-arcum-border/50">
                    <span>Norm Decay Loss:</span>
                    <span>-{scenario.decayPct}% effective units</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Norm Decay Infobox */}
            <div className="bg-arcum-card/40 border border-arcum-border rounded-xl p-4 flex items-start gap-3 text-xs text-arcum-muted">
              <HelpCircle className="w-4 h-4 text-arcum-cyan flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">How holding cost works in Arcum:</span> Option buyers pay continuous holding cost directly in-kind through the series normalization factor (Norm_t). While your ERC-20 token count stays constant at {tradeUnits} tokens, your effective exercisable units decrease continuously until sold.
              </div>
            </div>
          </div>

          {/* Right Column: Execution Order Card (Sticky) */}
          <div className="space-y-6">
            <div className="doppelrand-shell sticky top-24">
              <div className="doppelrand-core p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-arcum-border pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-white font-heading">Order Summary</h3>
                    <div className="text-xs text-arcum-muted font-mono">
                      {selectedStock.symbol} ${selectedStrike.toFixed(2)} {selectedSide === 'UP' ? 'Up (Call)' : 'Down (Put)'}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-mono bg-arcum-card border border-arcum-border text-arcum-cyan font-bold">
                    {selectedSpeed}
                  </span>
                </div>

                {/* Units Input */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-arcum-muted">
                    <span>Number of Units</span>
                    <span>1 Unit = 1 Whole Stock Token</span>
                  </div>
                  <div className="flex items-center bg-arcum-card border border-arcum-border rounded-lg px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={tradeUnits}
                      onChange={(e) => setTradeUnits(Math.max(1, parseFloat(e.target.value) || 1))}
                      className="bg-transparent text-white font-mono text-base focus:outline-none w-full"
                    />
                    <span className="text-xs font-mono text-arcum-muted">UNITS</span>
                  </div>
                </div>

                {/* Mathematical Breakdown */}
                <div className="bg-arcum-card/60 border border-arcum-border rounded-lg p-3.5 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-arcum-muted">Underlying Spot (S):</span>
                    <span className="text-white font-tabular">${currentQuote.spot.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-arcum-muted">Strike Price (K):</span>
                    <span className="text-white font-tabular">${currentQuote.strike.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-arcum-muted">Mark Price (Per Unit):</span>
                    <span className="text-white font-tabular">${currentQuote.markPriceUsdg.toFixed(3)} USDG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-arcum-muted">Protocol Fee (3 bps):</span>
                    <span className="text-white font-tabular">${currentQuote.feeUsdg.toFixed(3)} USDG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-arcum-muted">Est. Daily Holding Cost:</span>
                    <span className="text-amber-700 dark:text-amber-400 font-tabular">-${currentQuote.dailyDecayUsdg.toFixed(3)} / day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-arcum-muted">Delta (Δ):</span>
                    <span className="text-arcum-cyan font-tabular">{currentQuote.delta.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-arcum-border text-sm font-bold">
                    <span className="text-white">Total USDG Cost:</span>
                    <span className="text-arcum-cyan font-tabular">${currentQuote.totalCostUsdg.toFixed(2)} USDG</span>
                  </div>
                </div>

                {/* Action Button - Solid High-Contrast Architecture */}
                {walletConnected ? (
                  <button
                    onClick={() => {
                      setBuyStep('idle');
                      setShowBuyModal(true);
                    }}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                      selectedSide === 'UP'
                        ? 'bg-arcum-up text-white hover:brightness-110'
                        : 'bg-arcum-down text-white hover:brightness-110'
                    }`}
                  >
                    <span className="tracking-wide">Buy {selectedSide === 'UP' ? 'Up (Call)' : 'Down (Put)'} Option</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onConnectWallet}
                    className="w-full py-3.5 rounded-xl bg-arcum-cyan text-arcum-dark font-bold text-sm shadow-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <span>Connect Wallet to Trade</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}

                {/* Writer Pool Risk & Capacity Gauge */}
                <div className="bg-arcum-card border border-arcum-border rounded-xl p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-arcum-muted">
                    <span>Total Pool Risk Cap:</span>
                    <span className="text-white font-bold">35.0% NAV</span>
                  </div>
                  <div className="w-full bg-arcum-surface h-2 rounded-full overflow-hidden border border-arcum-border">
                    <div className="bg-arcum-cyan h-full rounded-full transition-all" style={{ width: '20%' }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-arcum-muted">
                    <span>Current: <strong className="text-arcum-cyan font-tabular">20.0%</strong></span>
                    <span>Headroom: <strong className="text-white font-tabular">$375,000</strong></span>
                  </div>
                  <div className="pt-2 border-t border-arcum-border/60 flex justify-between text-[11px] text-arcum-muted">
                    <span>{selectedStock.symbol} Single-Name Cap:</span>
                    <span className="text-arcum-up font-bold">4.8% / 8.0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE POSITIONS */}
      {activeTab === 'positions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">Your Everlasting Positions</h2>
              <p className="text-xs text-arcum-muted">Positions continuously accrue holding cost via Norm reduction. Sell at executable bid anytime.</p>
            </div>
            <button
              onClick={() => setActiveTab('trade')}
              className="self-start sm:self-auto px-4 py-2 rounded-lg bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-bold text-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 transition-all shadow-[0_2px_10px_rgba(2,132,199,0.3)] drop-shadow-sm"
            >
              <span>Open New Position</span> <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Position Cards (< md) */}
          <div className="block md:hidden space-y-3">
            {positions.map((pos) => {
              const isProfit = pos.pnlUsdg >= 0;
              return (
                <div
                  key={pos.id}
                  className="p-4 rounded-xl bg-arcum-surface border border-white/[0.08] space-y-3 shadow-sm font-mono"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-white font-sans">{pos.stock}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          pos.isCall ? 'bg-arcum-up/15 text-arcum-up' : 'bg-arcum-down/15 text-arcum-down'
                        }`}
                      >
                        {pos.isCall ? 'UP (Call)' : 'DOWN (Put)'}
                      </span>
                      <span className="text-[10px] text-arcum-muted">{pos.speed}</span>
                    </div>
                    <div
                      className={`text-xs font-bold font-tabular px-2 py-0.5 rounded ${
                        isProfit ? 'bg-arcum-up/10 text-arcum-up' : 'bg-arcum-down/10 text-arcum-down'
                      }`}
                    >
                      {isProfit ? '+' : ''}${pos.pnlUsdg.toFixed(2)} ({isProfit ? '+' : ''}{pos.pnlPct.toFixed(2)}%)
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-arcum-card/60">
                      <div className="text-[10px] text-arcum-muted">Strike Price</div>
                      <div className="text-white font-bold font-tabular mt-0.5">${pos.strike.toFixed(2)}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-arcum-card/60">
                      <div className="text-[10px] text-arcum-muted">Current Value</div>
                      <div className="text-arcum-cyan font-bold font-tabular mt-0.5">${pos.currentValueUsdg.toFixed(2)} USDG</div>
                    </div>
                    <div className="p-2 rounded-lg bg-arcum-card/60">
                      <div className="text-[10px] text-arcum-muted">Effective Units</div>
                      <div className="text-white font-bold font-tabular mt-0.5">{pos.effectiveUnits.toFixed(2)}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-arcum-card/60">
                      <div className="text-[10px] text-arcum-muted">Holding Norm</div>
                      <div className="text-amber-400 font-bold font-tabular mt-0.5">{(pos.norm * 100).toFixed(1)}%</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleClosePosition(pos.id)}
                    className="w-full py-2.5 rounded-lg bg-arcum-card hover:bg-arcum-down/20 hover:text-arcum-down text-white border border-arcum-border transition-all text-xs font-sans font-semibold active:scale-[0.98]"
                  >
                    Close & Sell Position
                  </button>
                </div>
              );
            })}
          </div>

            {/* Desktop Positions Table (>= md) */}
          <div className="hidden md:block bg-arcum-surface border border-arcum-border rounded-2xl overflow-hidden shadow-card">
            <table className="w-full text-left text-xs font-mono min-w-[700px]">
              <thead className="bg-arcum-card border-b border-arcum-border text-arcum-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Asset & Side</th>
                  <th className="px-5 py-3">Strike</th>
                  <th className="px-5 py-3">Raw Tokens</th>
                  <th className="px-5 py-3">Current Norm</th>
                  <th className="px-5 py-3">Effective Units</th>
                  <th className="px-5 py-3">Current Value</th>
                  <th className="px-5 py-3">Unrealized PnL</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arcum-border">
                {positions.map((pos) => {
                  const isProfit = pos.pnlUsdg >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-arcum-card/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-sm text-white font-sans flex items-center gap-1.5">
                          {pos.stock}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              pos.isCall ? 'bg-arcum-up/10 text-arcum-up' : 'bg-arcum-down/10 text-arcum-down'
                            }`}
                          >
                            {pos.isCall ? 'UP' : 'DOWN'}
                          </span>
                        </div>
                        <div className="text-[10px] text-arcum-muted">{pos.speed}</div>
                      </td>
                      <td className="px-5 py-4 text-white font-tabular font-medium">${pos.strike.toFixed(2)}</td>
                      <td className="px-5 py-4 text-white font-tabular">{pos.rawTokens.toFixed(2)}</td>
                      <td className="px-5 py-4 font-tabular text-arcum-cyan">
                        {(pos.norm * 100).toFixed(1)}%
                        <div className="text-[10px] text-arcum-muted">Decay active</div>
                      </td>
                      <td className="px-5 py-4 text-white font-tabular font-bold">{pos.effectiveUnits.toFixed(2)}</td>
                      <td className="px-5 py-4 text-white font-tabular font-bold">${pos.currentValueUsdg.toFixed(2)} USDG</td>
                      <td className={`px-5 py-4 font-tabular font-bold ${isProfit ? 'text-arcum-up' : 'text-arcum-down'}`}>
                        {isProfit ? '+' : ''}${pos.pnlUsdg.toFixed(2)} ({isProfit ? '+' : ''}{pos.pnlPct.toFixed(2)}%)
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          className="px-3 py-1.5 rounded-lg bg-arcum-card hover:bg-arcum-down/20 hover:text-arcum-down text-white border border-arcum-border transition-colors text-xs font-sans font-medium"
                        >
                          Close / Sell
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SHIELD PROTECTION */}
      {activeTab === 'shield' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arcum-cyan/10 text-arcum-cyan border border-arcum-cyan/25 text-xs font-mono">
              <Shield className="w-3.5 h-3.5" /> Automated Stock Token Downside Floor
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Shield Portfolio Protection</h2>
            <p className="text-sm text-arcum-muted max-w-xl mx-auto">
              Hold synthetic Stock Tokens in your wallet? Shield purchases the optimal eligible Weekly Put (Down) series to hedge against adverse market moves.
            </p>
          </div>

          <div className="bg-arcum-surface border border-arcum-border rounded-2xl p-4 sm:p-6 lg:p-8 space-y-6 glow-cyan-subtle">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-arcum-muted uppercase">Stock Token to Protect</label>
                <select
                  value={selectedStock.symbol}
                  onChange={(e) => {
                    const st = stocks.find((s) => s.symbol === e.target.value);
                    if (st) onSelectStock(st);
                  }}
                  className="w-full bg-arcum-card border border-arcum-border rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-arcum-cyan"
                >
                  {stocks.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} — {s.name} (${s.price.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Detected Wallet Balance */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-arcum-muted uppercase">Detected Wallet Holding</label>
                <div className="bg-arcum-card border border-arcum-border rounded-xl px-4 py-3 text-white text-sm font-mono flex items-center justify-between">
                  <span>50.0 {selectedStock.symbol} Tokens</span>
                  <span className="text-arcum-cyan">Valued: ${(selectedStock.price * 50).toFixed(2)} USDG</span>
                </div>
              </div>
            </div>

            {/* Protection Percentage Slider */}
            <div className="space-y-3 pt-4 border-t border-arcum-border">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-arcum-muted">Protection Strike Level</span>
                <span className="text-arcum-cyan font-bold">{shieldPctBelow}% OTM Put (${(selectedStock.price * (1 - shieldPctBelow / 100)).toFixed(2)})</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={shieldPctBelow}
                onChange={(e) => setShieldPctBelow(parseInt(e.target.value))}
                className="w-full accent-arcum-cyan h-2 bg-arcum-card rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-arcum-muted font-mono">
                <span>Tight Protection (-2%)</span>
                <span>Balanced (-5%)</span>
                <span>Catastrophe Shield (-15%)</span>
              </div>
            </div>

            {/* Quote Card */}
            {(() => {
              const shieldStrike = selectedStock.price * (1 - shieldPctBelow / 100);
              const shieldUnits = 50;
              const sQuote = quoteOption(
                selectedStock.price,
                shieldStrike,
                selectedStock.ivWeeklyBps,
                'WEEKLY',
                false,
                shieldUnits
              );
              return (
                <div className="bg-arcum-card border border-arcum-border rounded-xl p-5 space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-arcum-muted">Selected Put Strike:</span>
                    <span className="text-white font-bold">${shieldStrike.toFixed(2)} USDG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-arcum-muted">Speed Model:</span>
                    <span className="text-white">WEEKLY (τ = 7 days) — Slowest Decay</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-arcum-muted">Est. Protection Premium:</span>
                    <span className="text-arcum-cyan font-bold font-tabular">${sQuote.totalCostUsdg.toFixed(2)} USDG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-arcum-muted">Protocol Fee (3 bps):</span>
                    <span className="text-white font-tabular">${sQuote.feeUsdg.toFixed(3)} USDG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-arcum-muted">Guaranteed Floor Value:</span>
                    <span className="text-arcum-up font-bold font-tabular">${(shieldStrike * shieldUnits).toFixed(2)} USDG</span>
                  </div>
                </div>
              );
            })()}

            {/* Execute Shield */}
            <button
              onClick={handleExecuteShield}
              className="w-full py-3.5 rounded-xl bg-arcum-cyan text-arcum-dark font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 shadow-sm active:scale-[0.99] transition-all"
            >
              <Shield className="w-4 h-4" /> Execute 1-Click Shield Protection
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: WRITER POOL */}
      {activeTab === 'pool' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-arcum-cyan uppercase tracking-wider">Liquidity Underwriting</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">USDG Writer Pool</h2>
              <p className="text-xs text-arcum-muted">
                Underwrite everlasting options, earn 80% protocol fee share + continuous holding funding. Capital entry and exit are governed by conservative liability bounds.
              </p>
            </div>
            <div className="bg-arcum-surface border border-arcum-border px-4 py-2 rounded-xl text-right font-mono text-xs">
              <div className="text-arcum-muted">Estimated Current APR</div>
              <div className="text-xl font-bold text-arcum-up font-tabular">{poolStats.aprPct}%</div>
            </div>
          </div>

          {/* Key Pool Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-arcum-surface border border-arcum-border rounded-xl p-4 sm:p-5 font-mono">
              <div className="text-xs text-arcum-muted uppercase">Pool NAV</div>
              <div className="text-xl sm:text-2xl font-bold text-white font-tabular mt-1">
                ${(poolStats.navUsdg / 1e6).toFixed(2)}M
              </div>
              <div className="text-[11px] text-arcum-muted mt-1">Cash + Hedges - Liability</div>
            </div>
            <div className="bg-arcum-surface border border-arcum-border rounded-xl p-4 sm:p-5 font-mono">
              <div className="text-xs text-arcum-muted uppercase">NAV Per Share</div>
              <div className="text-xl sm:text-2xl font-bold text-arcum-cyan font-tabular mt-1">
                ${poolStats.navPerShare.toFixed(4)}
              </div>
              <div className="text-[11px] text-arcum-up mt-1">+10 bps entry premium</div>
            </div>
            <div className="bg-arcum-surface border border-arcum-border rounded-xl p-4 sm:p-5 font-mono">
              <div className="text-xs text-arcum-muted uppercase">Capacity Utilization</div>
              <div className="text-xl sm:text-2xl font-bold text-white font-tabular mt-1">
                {poolStats.capacityUtilizationPct}%
              </div>
              <div className="text-[11px] text-arcum-muted mt-1">Max 35% NAV total cap</div>
            </div>
            <div className="bg-arcum-surface border border-arcum-border rounded-xl p-4 sm:p-5 font-mono">
              <div className="text-xs text-arcum-muted uppercase">Withdrawal Rules</div>
              <div className="text-xl sm:text-2xl font-bold text-white font-tabular mt-1">
                72h Queue
              </div>
              <div className="text-[11px] text-arcum-muted mt-1">24h lock, 7d claim window</div>
            </div>
          </div>

          {/* Deposit & Withdrawal Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Deposit Box */}
            <div className="bg-arcum-surface border border-arcum-border rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
              <h3 className="font-bold text-lg text-white">Deposit USDG Capital</h3>
              <p className="text-xs text-arcum-muted">
                Receive pool shares minted at the conservative lower-bound valuation. Deposit remains locked for 24 hours before a withdrawal notice can be submitted.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-mono text-arcum-muted">Deposit Amount (USDG)</label>
                <div className="flex items-center bg-arcum-card border border-arcum-border rounded-lg px-4 py-2.5">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    className="bg-transparent text-white font-mono text-base focus:outline-none w-full"
                  />
                  <span className="text-xs font-mono text-arcum-muted">USDG</span>
                </div>
              </div>

              <div className="bg-arcum-card border border-arcum-border rounded-lg p-3 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-arcum-muted">Est. Pool Shares:</span>
                  <span className="text-white font-tabular font-bold">
                    {(depositAmount / poolStats.navPerShare).toFixed(2)} SHARES
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-arcum-muted">Deposit Lock Period:</span>
                  <span className="text-amber-400 font-tabular">24 Hours</span>
                </div>
              </div>

              <button
                onClick={handleDepositPool}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-bold text-sm hover:opacity-95 transition-all shadow-[0_4px_16px_rgba(2,132,199,0.3)] drop-shadow-sm active:scale-[0.99]"
              >
                Approve & Deposit USDG
              </button>
            </div>

            {/* Withdrawal Queue Box */}
            <div className="bg-arcum-surface border border-arcum-border rounded-2xl p-6 space-y-5">
              <h3 className="font-bold text-lg text-white">Request Withdrawal</h3>
              <p className="text-xs text-arcum-muted">
                Withdrawals follow an asynchronous 72-hour notice ticket queue. Payouts are calculated at the claim-time valuation to ensure zero front-running.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-mono text-arcum-muted">Shares to Burn</label>
                <div className="flex items-center bg-arcum-card border border-arcum-border rounded-lg px-4 py-2.5">
                  <input
                    type="number"
                    value={withdrawShares}
                    onChange={(e) => setWithdrawShares(parseFloat(e.target.value) || 0)}
                    className="bg-transparent text-white font-mono text-base focus:outline-none w-full"
                  />
                  <span className="text-xs font-mono text-arcum-muted">SHARES</span>
                </div>
              </div>

              <div className="bg-arcum-card border border-arcum-border rounded-lg p-3 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-arcum-muted">Notice Delay:</span>
                  <span className="text-white">72 Hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-arcum-muted">Claim Window:</span>
                  <span className="text-white">7 Calendar Days</span>
                </div>
              </div>

              <button
                onClick={handleWithdrawRequest}
                className="w-full py-3.5 rounded-xl bg-arcum-card border border-arcum-border hover:border-arcum-cyan text-white font-bold text-sm transition-all"
              >
                Create Withdrawal Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AGENTS & MCP */}
      {activeTab === 'agents' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arcum-cyan/10 text-arcum-cyan border border-arcum-cyan/25 text-xs font-mono">
              <Bot className="w-3.5 h-3.5" /> Owner-Authorized On-Chain Delegation
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Agent Router & MCP Integration</h2>
            <p className="text-sm text-arcum-muted max-w-xl mx-auto">
              Empower autonomous AI trading agents (via Model Context Protocol) to execute bounded trades. The contract strictly guarantees that sales proceeds always return to you.
            </p>
          </div>

          <div className="bg-arcum-surface border border-arcum-border rounded-2xl p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-arcum-border pb-4">
              <div>
                <h3 className="font-bold text-white text-base">Active On-Chain Policy</h3>
                <div className="text-xs text-arcum-muted font-mono">{agentPolicy.agentAddress}</div>
              </div>
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${agentPolicy.revoked ? 'bg-arcum-down/15 text-arcum-down' : 'bg-arcum-up/15 text-arcum-up'}`}>
                {agentPolicy.revoked ? 'REVOKED' : 'ACTIVE POLICY'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
              <div className="bg-arcum-card p-3 rounded-lg border border-arcum-border">
                <div className="text-arcum-muted">Total Budget</div>
                <div className="text-base font-bold text-white font-tabular mt-1">${agentPolicy.budgetUsdg} USDG</div>
              </div>
              <div className="bg-arcum-card p-3 rounded-lg border border-arcum-border">
                <div className="text-arcum-muted">Remaining Allowance</div>
                <div className="text-base font-bold text-arcum-cyan font-tabular mt-1">${agentPolicy.budgetUsdg - agentPolicy.spentUsdg} USDG</div>
              </div>
              <div className="bg-arcum-card p-3 rounded-lg border border-arcum-border">
                <div className="text-arcum-muted">Max Per Trade</div>
                <div className="text-base font-bold text-white font-tabular mt-1">${agentPolicy.maxPerTradeUsdg} USDG</div>
              </div>
              <div className="bg-arcum-card p-3 rounded-lg border border-arcum-border">
                <div className="text-arcum-muted">Expires In</div>
                <div className="text-base font-bold text-white font-tabular mt-1">14 Days</div>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="text-arcum-muted">Allowed Underlyings:</div>
              <div className="flex gap-2">
                {agentPolicy.allowedStocks.map((sym) => (
                  <span key={sym} className="px-2.5 py-1 rounded bg-arcum-card text-white border border-arcum-border">
                    {sym}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-arcum-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-arcum-muted font-mono">Policy authority: AgentRouter.sol</span>
              <button
                onClick={handleTogglePolicy}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold transition-all text-center ${
                  agentPolicy.revoked
                    ? 'bg-arcum-up text-arcum-dark'
                    : 'bg-arcum-down/15 border border-arcum-down/40 text-arcum-down hover:bg-arcum-down hover:text-white'
                }`}
              >
                {agentPolicy.revoked ? 'Re-Authorize Agent' : 'Instant Revoke Policy'}
              </button>
            </div>
          </div>

          {/* Model Context Protocol (MCP) Tool Suite & 1-Click Config */}
          <div className="bg-arcum-surface border border-arcum-border rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arcum-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-arcum-cyan/10 border border-arcum-cyan/25 flex items-center justify-center text-arcum-cyan">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Model Context Protocol (MCP) Suite</h3>
                  <p className="text-xs text-arcum-muted font-mono">Standard JSON-RPC 2.0 stdio server for Claude, Cursor, and autonomous agents</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const cfg = JSON.stringify(
                    {
                      mcpServers: {
                        "arcum-everlasting-options": {
                          command: "bun",
                          args: ["run", "app/src/mcp/server.ts"],
                          env: {
                            CHAIN_ID: "4663",
                            RPC_URL: "https://rpc.mainnet.chain.robinhood.com",
                            USDG_ADDRESS: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"
                          }
                        }
                      }
                    },
                    null,
                    2
                  );
                  navigator.clipboard.writeText(cfg);
                  setMcpCopied(true);
                  setTimeout(() => setMcpCopied(false), 2500);
                }}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-arcum-card border border-arcum-cyan/30 text-arcum-cyan hover:bg-arcum-cyan/10 text-xs font-mono font-bold transition-all"
              >
                {mcpCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-arcum-up" /> Copied MCP Config!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Claude/Cursor Config
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-arcum-card border border-arcum-border space-y-1">
                <div className="text-arcum-cyan font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-arcum-cyan" /> arcum_quote
                </div>
                <div className="text-arcum-muted">Calculates exact closed-form Euler-Cauchy ODE mark price, Greeks, and holding decay.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-arcum-card border border-arcum-border space-y-1">
                <div className="text-arcum-cyan font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-arcum-cyan" /> arcum_chain
                </div>
                <div className="text-arcum-muted">Inspects active spot prices, session status (Regular/Halted), and listed strikes.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-arcum-card border border-arcum-border space-y-1">
                <div className="text-arcum-cyan font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-arcum-cyan" /> arcum_shield
                </div>
                <div className="text-arcum-muted">Computes optimal Weekly Down Put hedging for tokenized equity holdings.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-arcum-card border border-arcum-border space-y-1">
                <div className="text-arcum-cyan font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-arcum-cyan" /> arcum_check_writer_pool
                </div>
                <div className="text-arcum-muted">Queries live pool NAV, capacity utilization, APR, and withdrawal queues.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-arcum-card border border-arcum-border space-y-1">
                <div className="text-arcum-cyan font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-arcum-cyan" /> arcum_check_policy
                </div>
                <div className="text-arcum-muted">Validates agent daily spending allowance, max per trade, and whitelist bounds.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-arcum-card border border-arcum-border space-y-1">
                <div className="text-arcum-cyan font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-arcum-cyan" /> arcum_execute_trade
                </div>
                <div className="text-arcum-muted">Dispatches gas-sponsored non-custodial trade via AgentRouter (Recipient ≡ Owner).</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-xl font-bold text-white">Network & Protocol Settings</h2>
          <div className="bg-arcum-surface border border-arcum-border rounded-xl p-6 space-y-4 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-arcum-muted">Connected Network</span>
              <div className="text-sm font-bold text-white">{CHAIN_CONFIG.chainName} (Chain ID {CHAIN_CONFIG.chainId})</div>
            </div>
            <div className="space-y-1">
              <span className="text-arcum-muted">RPC Endpoint</span>
              <input
                type="text"
                readOnly
                value={CHAIN_CONFIG.rpcUrl}
                className="w-full bg-arcum-card border border-arcum-border rounded-lg px-3 py-2 text-arcum-muted"
              />
            </div>
            <div className="space-y-1">
              <span className="text-arcum-muted">Slippage Tolerance</span>
              <div className="flex gap-2">
                {['0.5%', '1.0%', '2.0%'].map((slip) => (
                  <button key={slip} className="px-3 py-1.5 rounded bg-arcum-card border border-arcum-border text-white hover:border-arcum-cyan">
                    {slip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Recent Transaction Activity</h2>
          <div className="bg-arcum-surface border border-arcum-border rounded-xl p-5 font-mono text-xs text-arcum-muted">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-arcum-border gap-1">
                <span className="text-white">Bought 50.0 NVDA Up Options (Daily)</span>
                <span className="text-arcum-cyan">Block #18,942,109</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-arcum-border gap-1">
                <span className="text-white">Deposited 5,000 USDG to Writer Pool</span>
                <span className="text-arcum-cyan">Block #18,935,441</span>
              </div>
            </div>
          </div>
        </div>
      )}

      </div> {/* Close flex-1 min-w-0 */}

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-arcum-surface border border-arcum-border rounded-2xl max-w-md w-full p-6 space-y-6 glow-cyan-subtle animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-arcum-border pb-3">
              <h3 className="font-bold text-lg text-white">Confirm Option Order</h3>
              <button
                onClick={() => setShowBuyModal(false)}
                className="text-arcum-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-arcum-muted">Asset:</span>
                <span className="text-white font-bold">{selectedStock.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-arcum-muted">Contract:</span>
                <span className="text-white">{selectedSide === 'UP' ? 'Up (Call)' : 'Down (Put)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-arcum-muted">Strike:</span>
                <span className="text-white">${selectedStrike.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-arcum-muted">Units:</span>
                <span className="text-white">{tradeUnits} Tokens</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-arcum-border">
                <span className="text-white">Total USDG:</span>
                <span className="text-arcum-cyan">${currentQuote.totalCostUsdg.toFixed(2)} USDG</span>
              </div>
            </div>

            {/* Stepper Status */}
            {buyStep === 'idle' && (
              <button
                onClick={handleExecuteBuy}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-bold text-sm hover:opacity-95 transition-all shadow-[0_4px_16px_rgba(2,132,199,0.3)] drop-shadow-sm active:scale-[0.99]"
              >
                Approve USDG & Execute Buy
              </button>
            )}

            {buyStep === 'approving' && (
              <div className="flex items-center justify-center gap-2 py-3.5 text-xs font-mono text-arcum-cyan">
                <RefreshCw className="w-4 h-4 animate-spin" /> Step 1/2: Approving exact USDG allowance...
              </div>
            )}

            {buyStep === 'approved' && (
              <div className="flex items-center justify-center gap-2 py-3.5 text-xs font-mono text-arcum-up">
                <CheckCircle2 className="w-4 h-4" /> USDG Approved! Submitting option purchase...
              </div>
            )}

            {buyStep === 'buying' && (
              <div className="flex items-center justify-center gap-2 py-3.5 text-xs font-mono text-arcum-cyan">
                <RefreshCw className="w-4 h-4 animate-spin" /> Step 2/2: Confirming transaction on Robinhood Chain...
              </div>
            )}

            {buyStep === 'success' && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-arcum-up/20 text-arcum-up flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Option Bought Successfully!</h4>
                  <p className="text-xs text-arcum-muted mt-1 font-mono">
                    Minted {tradeUnits} {selectedStock.symbol} option tokens to your wallet.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBuyModal(false);
                    setActiveTab('positions');
                  }}
                  className="w-full py-3 rounded-lg bg-arcum-card border border-arcum-border text-white text-xs font-bold hover:bg-arcum-surface"
                >
                  View in Positions
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* In-App Toast Container */}
      <div className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all animate-in slide-in-from-top-2 duration-300 flex items-start gap-3 ${
              toast.type === 'success'
                ? 'bg-arcum-surface/95 border-arcum-cyan/40 text-white shadow-[0_4px_24px_rgba(25,230,255,0.2)]'
                : toast.type === 'warning'
                ? 'bg-arcum-surface/95 border-amber-500/40 text-white shadow-[0_4px_24px_rgba(245,158,11,0.2)]'
                : toast.type === 'error'
                ? 'bg-arcum-surface/95 border-arcum-down/40 text-white shadow-[0_4px_24px_rgba(244,63,94,0.2)]'
                : 'bg-arcum-surface/95 border-white/20 text-white shadow-[0_4px_24px_rgba(255,255,255,0.1)]'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-arcum-cyan" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-arcum-down" />}
              {toast.type === 'info' && <Clock className="w-5 h-5 text-arcum-cyan" />}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-bold text-xs text-white tracking-wide">{toast.title}</h5>
              <p className="text-[11px] text-arcum-muted leading-relaxed mt-0.5 break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-arcum-muted hover:text-white shrink-0 p-1 -mr-1 -mt-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
