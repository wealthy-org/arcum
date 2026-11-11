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
  ChevronDown,
  ChevronUp,
  Coins,
} from 'lucide-react';
import { StockInfo, Speed, OptionSide, UserPosition, WriterPoolStats, AgentPolicy } from '../types';
import { quoteOption, calculateScenarioPnL } from '../utils/pricing';
import { INITIAL_POOL_STATS, INITIAL_AGENT_POLICY, CHAIN_CONFIG, CONTRACT_ADDRESSES } from '../data/protocol';
import { getExplorerTxUrl } from '../config/wagmi';
import { useOnChainTrade } from '../hooks/useOnChainTrade';

interface DashboardPageProps {
  stocks: StockInfo[];
  selectedStock: StockInfo;
  onSelectStock: (stock: StockInfo) => void;
  walletConnected: boolean;
  onConnectWallet: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNavigate?: (route: string, tab?: string) => void;
  userAddress?: string;
  isDemoMode?: boolean;
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
  userAddress,
  isDemoMode = false,
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
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [showPoolStats, setShowPoolStats] = useState<boolean>(false);

  // On-Chain Transaction & Trade Hook
  const {
    step: buyStep,
    setStep: setBuyStep,
    approveTxHash,
    buyTxHash,
    errorMessage: tradeError,
    executeTrade,
    resetTrade,
    chainId,
  } = useOnChainTrade();

  // What-If Scenario State
  const [scenarioDays, setScenarioDays] = useState<number>(3);
  const [targetMovePct, setTargetMovePct] = useState<number>(5);
  const [shieldPctBelow, setShieldPctBelow] = useState<number>(5);

  // Writer Pool state
  const [poolStats, setPoolStats] = useState<WriterPoolStats>(INITIAL_POOL_STATS);
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [withdrawShares, setWithdrawShares] = useState<number>(500);

  // Sync with live on-chain / API pool telemetry
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
        // Fallback to INITIAL_POOL_STATS
      }
    };
    fetchPoolTelemetry();
  }, []);

  // In-App Toast Notification System
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
    }, 4000);
  };

  // User Positions Mock State
  const [positions, setPositions] = useState<UserPosition[]>([
    {
      id: 'pos-1',
      seriesId: '0x4e56444100000000000000000000000000000000000000000000000000000001',
      stock: 'NVDA',
      isCall: true,
      speed: 'DAILY',
      strike: 140,
      rawTokens: 25,
      norm: 0.985,
      effectiveUnits: 24.625,
      entryPriceUsdg: 3.12,
      currentValueUsdg: 74.91,
      pnlUsdg: -3.09,
      pnlPct: -3.96,
      boughtAt: Date.now() - 86400000 * 1.5,
    },
    {
      id: 'pos-2',
      seriesId: '0x54534c4100000000000000000000000000000000000000000000000000000002',
      stock: 'TSLA',
      isCall: false,
      speed: 'WEEKLY',
      strike: 240,
      rawTokens: 10,
      norm: 0.992,
      effectiveUnits: 9.92,
      entryPriceUsdg: 5.4,
      currentValueUsdg: 58.2,
      pnlUsdg: 4.2,
      pnlPct: 7.78,
      boughtAt: Date.now() - 86400000 * 0.8,
    },
  ]);

  // Agent Policy State
  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy>(INITIAL_AGENT_POLICY);
  const [mcpCopied, setMcpCopied] = useState<boolean>(false);

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

  // Dynamic strike calculation
  const strikeInterval = Math.max(1, Math.round(selectedStock.price * 0.02));
  const baseStrike = Math.round(selectedStock.price / strikeInterval) * strikeInterval;
  const strikes = [
    baseStrike - strikeInterval * 2,
    baseStrike - strikeInterval,
    baseStrike,
    baseStrike + strikeInterval,
    baseStrike + strikeInterval * 2,
  ];

  const handleExecuteBuy = async () => {
    const success = await executeTrade({
      seriesId: `0x${selectedStock.symbol}_${selectedSide}_${selectedStrike}_${selectedSpeed[0]}`,
      units: tradeUnits,
      totalCostUsdg: currentQuote.totalCostUsdg,
      isDemoMode,
    });

    if (success) {
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
      setPositions((prev) => [newPos, ...prev]);
      showToast(
        'Order Filled On-Chain',
        `Minted ${tradeUnits} ${selectedStock.symbol} ${selectedSide === 'UP' ? 'Up' : 'Down'} options at $${currentQuote.totalCostUsdg.toFixed(2)} USDG.`,
        'success'
      );
    }
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
      `100% Capital Floor established for ${selectedStock.symbol}. Optimal weekly put hedge acquired via ArcumEngine.sol.`,
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
      `Deposited $${depositAmount.toLocaleString()} USDG to Writer Pool. Received ${mintedShares} Virtual Shares.`,
      'success'
    );
  };

  const handleRequestWithdraw = () => {
    showToast(
      'Withdrawal Ticket #17 Registered',
      `Initiated notice to redeem ${withdrawShares} Shares. 72-hour notice timer active. Claimable after notice matures.`,
      'info'
    );
  };

  const handleToggleAgentRevoke = () => {
    const newRevoked = !agentPolicy.revoked;
    setAgentPolicy((prev) => ({ ...prev, revoked: newRevoked }));
    showToast(
      newRevoked ? 'Agent Policy Revoked' : 'Agent Policy Restored',
      newRevoked
        ? 'AgentRouter.sol has revoked autonomous trading authority on-chain.'
        : 'Autonomous trading policy restored under budget and whitelist constraints.',
      newRevoked ? 'warning' : 'success'
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-8 animate-in fade-in duration-300 font-sans">
      {/* 2. TAB CONTENT ROUTER */}

      {/* TAB 1: TRADE OPTIONS — TWO-COLUMN COUNTER SLIP (SURPLUS.CODES ARCHITECTURE) */}
      {activeTab === 'trade' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT: THE ORDER SLIP (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header / Intro */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--surplus-line-62)]">
                Perpetual Derivatives
              </span>
              <h1 className="text-3xl sm:text-4xl font-display font-medium tracking-tight text-[var(--surplus-line)]">
                Buy Everlasting Option
              </h1>
              <p className="text-xs sm:text-sm text-[var(--surplus-line-80)] font-mono max-w-xl">
                Continuous options with zero expiration on Robinhood Chain. Choose direction and strike to enter.
              </p>
            </div>

            {/* Asset Selection Bar (Clean Pills) */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-[var(--surplus-line-62)] flex justify-between">
                <span>Select Underlying Equity:</span>
                <span>Session: <strong className="text-emerald-400">REGULAR</strong></span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                {stocks.map((stock) => {
                  const isSel = selectedStock.symbol === stock.symbol;
                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => onSelectStock(stock)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all shrink-0 border ${
                        isSel
                          ? 'border-[var(--surplus-line)] bg-[var(--surplus-line)] text-[var(--surplus-ground)] font-bold shadow-sm'
                          : 'border-[var(--surplus-line-24)] bg-transparent text-[var(--surplus-line-80)] hover:border-[var(--surplus-line-62)] hover:text-[var(--surplus-line)]'
                      }`}
                    >
                      <span className="font-bold">{stock.symbol}</span>
                      <span className="font-tabular">${stock.price.toFixed(2)}</span>
                      <span
                        className={`text-[10px] ${
                          isSel
                            ? 'opacity-80'
                            : stock.change24h >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {stock.change24h >= 0 ? '+' : ''}{stock.change24h}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direction & Speed Selectors (Choice Rows) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option Side */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-[var(--surplus-line-62)]">Direction:</span>
                <div className="flex border border-[var(--surplus-line-40)] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setSelectedSide('UP')}
                    className={`flex-1 py-2.5 px-4 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                      selectedSide === 'UP'
                        ? 'bg-emerald-600 text-white'
                        : 'text-[var(--surplus-line-80)] hover:bg-[var(--surplus-line-08)]'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Up (Call)</span>
                  </button>
                  <button
                    onClick={() => setSelectedSide('DOWN')}
                    className={`flex-1 py-2.5 px-4 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all border-l border-[var(--surplus-line-40)] ${
                      selectedSide === 'DOWN'
                        ? 'bg-rose-600 text-white'
                        : 'text-[var(--surplus-line-80)] hover:bg-[var(--surplus-line-08)]'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>Down (Put)</span>
                  </button>
                </div>
              </div>

              {/* Funding Speed */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-[var(--surplus-line-62)]">Funding Speed:</span>
                <div className="flex border border-[var(--surplus-line-40)] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setSelectedSpeed('DAILY')}
                    className={`flex-1 py-2.5 px-3 text-xs font-mono font-bold transition-all ${
                      selectedSpeed === 'DAILY'
                        ? 'bg-[var(--surplus-line)] text-[var(--surplus-ground)]'
                        : 'text-[var(--surplus-line-80)] hover:bg-[var(--surplus-line-08)]'
                    }`}
                  >
                    Daily (τ=1d)
                  </button>
                  <button
                    onClick={() => setSelectedSpeed('WEEKLY')}
                    className={`flex-1 py-2.5 px-3 text-xs font-mono font-bold transition-all border-l border-[var(--surplus-line-40)] ${
                      selectedSpeed === 'WEEKLY'
                        ? 'bg-[var(--surplus-line)] text-[var(--surplus-ground)]'
                        : 'text-[var(--surplus-line-80)] hover:bg-[var(--surplus-line-08)]'
                    }`}
                  >
                    Weekly (τ=7d)
                  </button>
                </div>
              </div>
            </div>

            {/* Units Input (Surplus Big Typography Input) */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] space-y-2">
              <div className="flex justify-between text-xs font-mono text-[var(--surplus-line-62)]">
                <span>Quantity / Tokens</span>
                <span>1 Unit = 1 Whole Stock Token</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-[var(--surplus-line-40)] pb-2 gap-4">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={tradeUnits}
                  onChange={(e) => setTradeUnits(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full bg-transparent text-3xl sm:text-4xl font-display font-medium text-[var(--surplus-line)] focus:outline-none"
                />
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--surplus-line-62)] shrink-0">
                  Tokens
                </span>
              </div>
            </div>

            {/* Strike Price Selection Table (Spacious Ledger) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--surplus-line-62)]">
                <span>Select Strike Price (K):</span>
                <span>IV: <strong>{(activeIvBps / 100).toFixed(0)}%</strong></span>
              </div>

              <div className="border border-[var(--surplus-line-24)] rounded-2xl overflow-hidden divide-y divide-[var(--surplus-line-14)] font-mono text-xs">
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
                      className={`p-3.5 sm:p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--surplus-line-14)] border-l-4 border-l-[var(--surplus-line)]'
                          : 'hover:bg-[var(--surplus-line-08)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <span className="font-bold text-sm sm:text-base text-[var(--surplus-line)] font-sans">
                          ${strikeVal.toFixed(2)}
                        </span>
                        {isAtm && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            ATM
                          </span>
                        )}
                      </div>

                      <div className="hidden sm:flex items-center gap-1 text-[var(--surplus-line-62)]">
                        <span>Delta:</span>
                        <span className="text-[var(--surplus-line)] font-bold">{q.delta.toFixed(3)}</span>
                      </div>

                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold text-[var(--surplus-line)] font-tabular">
                          ${q.markPriceUsdg.toFixed(3)} <span className="text-[10px] text-[var(--surplus-line-62)]">USDG</span>
                        </div>
                        <div className="text-[10px] text-amber-500/90 font-tabular">
                          -${q.dailyDecayUsdg.toFixed(3)} / day
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                          isSelected
                            ? 'bg-[var(--surplus-line)] text-[var(--surplus-ground)]'
                            : 'border border-[var(--surplus-line-40)] text-[var(--surplus-line-80)] hover:border-[var(--surplus-line)]'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expandable What-If PnL & Decay Simulator (Clean & Uncluttered) */}
            <div className="border border-[var(--surplus-line-24)] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSimulator(!showSimulator)}
                className="w-full p-4 flex items-center justify-between text-xs font-mono text-[var(--surplus-line)] hover:bg-[var(--surplus-line-08)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-bold">What-If PnL & Decay Simulator</span>
                </div>
                <div className="flex items-center gap-1 text-[var(--surplus-line-62)]">
                  <span>{showSimulator ? 'Hide' : 'Expand Simulation'}</span>
                  {showSimulator ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showSimulator && (
                <div className="p-5 border-t border-[var(--surplus-line-14)] bg-[var(--surplus-line-08)] space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[var(--surplus-line-62)]">Target Move (%):</span>
                        <span className="text-[var(--surplus-line)] font-bold">{targetMovePct >= 0 ? '+' : ''}{targetMovePct}%</span>
                      </div>
                      <input
                        type="range"
                        min="-30"
                        max="30"
                        step="1"
                        value={targetMovePct}
                        onChange={(e) => setTargetMovePct(parseInt(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[var(--surplus-line-62)]">Holding Horizon:</span>
                        <span className="text-[var(--surplus-line)] font-bold">{scenarioDays} Days</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="14"
                        step="1"
                        value={scenarioDays}
                        onChange={(e) => setScenarioDays(parseInt(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {[
                      { label: 'Beat (+8%, 1d)', move: 8, days: 1 },
                      { label: 'Drop (-10%, 2d)', move: -10, days: 2 },
                      { label: 'Drift (+3%, 7d)', move: 3, days: 7 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setTargetMovePct(preset.move);
                          setScenarioDays(preset.days);
                        }}
                        className="flex-1 py-1.5 rounded-lg border border-[var(--surplus-line-24)] text-[11px] text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)] hover:border-[var(--surplus-line-62)]"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const scenario = calculateScenarioPnL(
                      selectedStock.price,
                      selectedStrike,
                      activeIvBps,
                      selectedSpeed,
                      selectedSide === 'UP',
                      tradeUnits,
                      targetMovePct,
                      scenarioDays
                    );
                    return (
                      <div className="p-3.5 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-ground)] flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-[var(--surplus-line-62)]">Simulated Spot Price</div>
                          <div className="text-sm font-bold text-[var(--surplus-line)] font-tabular">
                            ${scenario.spotTarget.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-[var(--surplus-line-62)]">Projected Net PnL</div>
                          <div className={`text-sm font-bold font-tabular ${scenario.netPnlUsdg >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {scenario.netPnlUsdg >= 0 ? '+' : ''}${scenario.netPnlUsdg.toFixed(2)} USDG ({scenario.roiPct.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: THE REGISTER & RECEIPT (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            {/* Surplus Window Receipt Box */}
            <div className="surplus-window p-6 sm:p-7 rounded-2xl space-y-6">
              <div className="border-b border-[var(--surplus-line-40)] pb-4 flex justify-between items-baseline">
                <div>
                  <h3 className="font-display font-medium text-xl text-[var(--surplus-line)]">
                    Order Summary
                  </h3>
                  <div className="text-xs font-mono text-[var(--surplus-line-62)]">
                    {selectedStock.symbol} • ${selectedStrike.toFixed(2)} • {selectedSide === 'UP' ? 'Up (Call)' : 'Down (Put)'}
                  </div>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded border border-[var(--surplus-line-40)] font-bold text-[var(--surplus-line)]">
                  {selectedSpeed}
                </span>
              </div>

              {/* Dot-Leader Pricing Rows */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Underlying Spot:</span>
                  <div className="dot-leader" />
                  <span className="text-[var(--surplus-line)] font-tabular">${currentQuote.spot.toFixed(2)}</span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Strike Price (K):</span>
                  <div className="dot-leader" />
                  <span className="text-[var(--surplus-line)] font-tabular">${currentQuote.strike.toFixed(2)}</span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Units to Mint:</span>
                  <div className="dot-leader" />
                  <span className="text-[var(--surplus-line)] font-bold font-tabular">{tradeUnits} Tokens</span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Mark Price (Unit):</span>
                  <div className="dot-leader" />
                  <span className="text-[var(--surplus-line)] font-tabular">${currentQuote.markPriceUsdg.toFixed(3)} USDG</span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Est. Daily Decay:</span>
                  <div className="dot-leader" />
                  <span className="text-amber-400 font-tabular">-${currentQuote.dailyDecayUsdg.toFixed(3)} / day</span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Delta (Δ):</span>
                  <div className="dot-leader" />
                  <span className="text-[var(--surplus-line)] font-tabular">{currentQuote.delta.toFixed(3)}</span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Protocol Fee (3 bps):</span>
                  <div className="dot-leader" />
                  <span className="text-[var(--surplus-line)] font-tabular">${currentQuote.feeUsdg.toFixed(3)} USDG</span>
                </div>

                <div className="flex items-baseline justify-between gap-2 pt-3 border-t border-[var(--surplus-line-40)] text-sm font-bold">
                  <span className="text-[var(--surplus-line)]">Total Settlement:</span>
                  <div className="dot-leader" />
                  <span className="text-emerald-400 font-tabular text-base">
                    ${currentQuote.totalCostUsdg.toFixed(2)} USDG
                  </span>
                </div>
              </div>

              {/* Active Account Pill */}
              <div className="p-3 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isDemoMode ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                  <span className="text-[var(--surplus-line-62)] shrink-0">{isDemoMode ? 'Simulator' : 'Wallet'}:</span>
                  <span className="text-[var(--surplus-line)] font-bold truncate">
                    {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : '0x71C8...a49B'}
                  </span>
                </div>
                <span className="text-[var(--surplus-line)] font-bold shrink-0">
                  {isDemoMode ? '$25k USDG' : '4663'}
                </span>
              </div>

              {/* Action Button: Surplus Tactile Stamp Button */}
              {walletConnected ? (
                <button
                  type="button"
                  onClick={() => {
                    resetTrade();
                    setShowBuyModal(true);
                  }}
                  className="stamp-btn py-4 w-full text-xs sm:text-sm tracking-wider"
                >
                  <span>Buy {selectedSide === 'UP' ? 'Up (Call)' : 'Down (Put)'} Option</span>
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onConnectWallet}
                  className="stamp-btn py-4 w-full text-xs sm:text-sm tracking-wider"
                >
                  <span>Connect Wallet to Trade</span>
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </button>
              )}

              {/* Expandable Pool Capacity Drawer */}
              <div className="border-t border-[var(--surplus-line-24)] pt-3">
                <button
                  type="button"
                  onClick={() => setShowPoolStats(!showPoolStats)}
                  className="w-full flex items-center justify-between text-[11px] font-mono text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)]"
                >
                  <span>Writer Pool Risk Cap: <strong>35.0% NAV</strong></span>
                  {showPoolStats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showPoolStats && (
                  <div className="mt-3 p-3 rounded-lg border border-[var(--surplus-line-14)] space-y-2 text-[11px] font-mono text-[var(--surplus-line-80)]">
                    <div className="flex justify-between">
                      <span>Total Pool NAV:</span>
                      <span className="font-tabular font-bold">${poolStats.navUsdg.toLocaleString()} USDG</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Headroom:</span>
                      <span className="font-tabular text-emerald-400 font-bold">$375,000 USDG</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Capacity Used:</span>
                      <span className="font-tabular">{poolStats.capacityUtilizationPct}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POSITIONS */}
      {activeTab === 'positions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--surplus-line-24)] pb-4">
            <div>
              <h2 className="text-2xl font-display font-medium text-[var(--surplus-line)]">
                Active Everlasting Positions
              </h2>
              <p className="text-xs font-mono text-[var(--surplus-line-62)]">
                Decaying positions track in-kind funding via series normalization factor.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('trade')}
              className="stamp-btn py-2 px-4 text-xs"
            >
              Open New Position
            </button>
          </div>

          {positions.length === 0 ? (
            <div className="p-12 text-center border border-[var(--surplus-line-24)] rounded-2xl space-y-3 font-mono text-xs text-[var(--surplus-line-62)]">
              <p>No open everlasting options positions in this account.</p>
              <button
                onClick={() => setActiveTab('trade')}
                className="stamp-btn py-2.5 px-5 text-xs"
              >
                Go to Trading Terminal
              </button>
            </div>
          ) : (
            <div className="border border-[var(--surplus-line-24)] rounded-2xl overflow-x-auto font-mono text-xs">
              <table className="w-full text-left">
                <thead className="border-b border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] text-[var(--surplus-line-62)]">
                  <tr>
                    <th className="p-3.5 font-normal">Asset & Side</th>
                    <th className="p-3.5 font-normal">Strike</th>
                    <th className="p-3.5 font-normal">Speed</th>
                    <th className="p-3.5 font-normal text-right">Raw Tokens</th>
                    <th className="p-3.5 font-normal text-right">Norm</th>
                    <th className="p-3.5 font-normal text-right">Value</th>
                    <th className="p-3.5 font-normal text-right">PnL</th>
                    <th className="p-3.5 font-normal text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surplus-line-14)]">
                  {positions.map((pos) => (
                    <tr key={pos.id} className="hover:bg-[var(--surplus-line-08)] transition-colors">
                      <td className="p-3.5 font-bold text-[var(--surplus-line)]">
                        {pos.stock} {pos.isCall ? 'UP (Call)' : 'DOWN (Put)'}
                      </td>
                      <td className="p-3.5 font-tabular">${pos.strike.toFixed(2)}</td>
                      <td className="p-3.5">{pos.speed}</td>
                      <td className="p-3.5 text-right font-tabular">{pos.rawTokens}</td>
                      <td className="p-3.5 text-right font-tabular text-amber-400">{pos.norm.toFixed(3)}</td>
                      <td className="p-3.5 text-right font-tabular font-bold">${pos.currentValueUsdg.toFixed(2)} USDG</td>
                      <td className={`p-3.5 text-right font-tabular font-bold ${pos.pnlUsdg >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pos.pnlUsdg >= 0 ? '+' : ''}${pos.pnlUsdg.toFixed(2)} ({pos.pnlPct.toFixed(1)}%)
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          className="px-3 py-1 rounded border border-[var(--surplus-line-40)] text-[var(--surplus-line)] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] font-bold transition-all"
                        >
                          Close / Sell
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 1-CLICK SHIELD */}
      {activeTab === 'shield' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-1">
            <h2 className="text-2xl font-display font-medium text-[var(--surplus-line)]">
              1-Click Automated Shield Protection
            </h2>
            <p className="text-xs font-mono text-[var(--surplus-line-62)]">
              Automated institutional downside hedging for tokenized stock portfolios.
            </p>
          </div>

          <div className="surplus-window p-6 sm:p-8 rounded-2xl space-y-6 font-mono text-xs">
            <div className="space-y-2">
              <span className="text-[var(--surplus-line-62)]">Select Equity to Protect:</span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {stocks.map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => onSelectStock(stock)}
                    className={`px-4 py-2 rounded-xl border ${
                      selectedStock.symbol === stock.symbol
                        ? 'bg-[var(--surplus-line)] text-[var(--surplus-ground)] font-bold border-[var(--surplus-line)]'
                        : 'border-[var(--surplus-line-24)] text-[var(--surplus-line-80)]'
                    }`}
                  >
                    {stock.symbol} (${stock.price.toFixed(2)})
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[var(--surplus-line-62)]">Optimal Hedging Put:</span>
                <span className="text-[var(--surplus-line)] font-bold text-sm">
                  {selectedStock.symbol} Weekly Put ${(selectedStock.price * 0.95).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[var(--surplus-line-62)]">Capital Floor Protection:</span>
                <span className="text-emerald-400 font-bold">95.0% Portfolio Value</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[var(--surplus-line-62)]">Weekly Insurance Cost:</span>
                <span className="text-amber-400 font-bold">~0.71% of Portfolio</span>
              </div>
            </div>

            <button
              onClick={handleExecuteShield}
              className="stamp-btn py-4 w-full text-xs sm:text-sm"
            >
              <span>Activate 1-Click Shield Protection</span>
              <Shield className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: WRITER POOL */}
      {activeTab === 'pool' && (
        <div className="space-y-6">
          <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-1">
            <h2 className="text-2xl font-display font-medium text-[var(--surplus-line)]">
              USDG Writer Pool & Solvency Layer
            </h2>
            <p className="text-xs font-mono text-[var(--surplus-line-62)]">
              Underwrite everlasting option liability, earn 80% protocol fees, and manage withdrawal queues.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs">
            {/* Deposit Box */}
            <div className="surplus-window p-6 rounded-2xl space-y-5">
              <h3 className="text-base font-display font-medium text-[var(--surplus-line)]">
                Deposit USDG Liquidity
              </h3>
              <div className="space-y-2">
                <span className="text-[var(--surplus-line-62)]">Deposit Amount:</span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-xl p-3 text-lg font-bold text-[var(--surplus-line)] focus:outline-none"
                />
              </div>
              <div className="text-[11px] text-[var(--surplus-line-62)] space-y-1">
                <div>• Enforces 24-Hour Deposit Lock.</div>
                <div>• Captures 48% LP fee share + 10 bps anti-dilution.</div>
              </div>
              <button
                onClick={handleDepositPool}
                className="stamp-btn py-3.5 w-full text-xs font-bold"
              >
                Deposit & Mint AWP Shares
              </button>
            </div>

            {/* Withdraw Box */}
            <div className="surplus-window p-6 rounded-2xl space-y-5">
              <h3 className="text-base font-display font-medium text-[var(--surplus-line)]">
                Withdrawal Queue (72h Notice)
              </h3>
              <div className="space-y-2">
                <span className="text-[var(--surplus-line-62)]">Shares to Redeem:</span>
                <input
                  type="number"
                  value={withdrawShares}
                  onChange={(e) => setWithdrawShares(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-xl p-3 text-lg font-bold text-[var(--surplus-line)] focus:outline-none"
                />
              </div>
              <div className="text-[11px] text-[var(--surplus-line-62)] space-y-1">
                <div>• Requires 72-Hour notice notice period.</div>
                <div>• Payout settled at mature ticket NAV.</div>
              </div>
              <button
                onClick={handleRequestWithdraw}
                className="stamp-btn py-3.5 w-full text-xs font-bold"
              >
                Request Withdrawal Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AI AGENTS */}
      {activeTab === 'agents' && (
        <div className="max-w-3xl mx-auto space-y-6 font-mono text-xs">
          <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-1">
            <h2 className="text-2xl font-display font-medium text-[var(--surplus-line)]">
              AI Agents & Model Context Protocol (MCP)
            </h2>
            <p className="text-[var(--surplus-line-62)]">
              Autonomous trading via bounded on-chain policies and Claude/Cursor tools.
            </p>
          </div>

          <div className="surplus-window p-6 rounded-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[var(--surplus-line)]">Agent Execution Policy</div>
                <div className="text-[11px] text-[var(--surplus-line-62)]">Contract: AgentRouter.sol</div>
              </div>
              <button
                onClick={handleToggleAgentRevoke}
                className={`px-3 py-1.5 rounded-lg font-bold ${
                  agentPolicy.revoked
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {agentPolicy.revoked ? 'Status: REVOKED' : 'Status: ACTIVE'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)]">
                <div className="text-[10px] text-[var(--surplus-line-62)]">Daily Budget Cap</div>
                <div className="text-sm font-bold text-[var(--surplus-line)]">${agentPolicy.budgetUsdg.toLocaleString()} USDG</div>
              </div>
              <div className="p-3 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)]">
                <div className="text-[10px] text-[var(--surplus-line-62)]">Max Single Trade</div>
                <div className="text-sm font-bold text-[var(--surplus-line)]">${agentPolicy.maxPerTradeUsdg.toLocaleString()} USDG</div>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText('npx -y @arcum/mcp');
                setMcpCopied(true);
                setTimeout(() => setMcpCopied(false), 2000);
              }}
              className="stamp-btn py-3 w-full text-xs font-bold"
            >
              <Terminal className="w-3.5 h-3.5 mr-2" />
              <span>{mcpCopied ? 'Copied MCP Stdio Config!' : 'Copy MCP Stdio Config Command'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="space-y-6 font-mono text-xs">
          <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-1">
            <h2 className="text-2xl font-display font-medium text-[var(--surplus-line)]">
              Protocol Activity & On-Chain Blocks
            </h2>
            <p className="text-[var(--surplus-line-62)]">
              Live trade logs and settlement receipts on Robinhood Chain.
            </p>
          </div>

          <div className="border border-[var(--surplus-line-24)] rounded-2xl divide-y divide-[var(--surplus-line-14)] overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-[var(--surplus-line-08)] font-bold text-[var(--surplus-line)]">
              <span>Bought 50.0 NVDA Up Options (Daily)</span>
              <span className="text-emerald-400">Block #18,942,109</span>
            </div>
            <div className="p-4 flex items-center justify-between text-[var(--surplus-line-80)]">
              <span>Deposited 5,000 USDG to Writer Pool</span>
              <span className="text-emerald-400">Block #18,935,441</span>
            </div>
            <div className="p-4 flex items-center justify-between text-[var(--surplus-line-80)]">
              <span>Funding Norm Decay Accrued (0.985 factor)</span>
              <span className="text-emerald-400">Block #18,930,012</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-6 font-mono text-xs">
          <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-1">
            <h2 className="text-2xl font-display font-medium text-[var(--surplus-line)]">
              Workspace Settings
            </h2>
            <p className="text-[var(--surplus-line-62)]">Manage RPC endpoints and notifications.</p>
          </div>

          <div className="surplus-window p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-[var(--surplus-line-14)]">
              <span>Active RPC Endpoint:</span>
              <span className="text-emerald-400 font-bold">https://rpc.mainnet.chain.robinhood.com</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[var(--surplus-line-14)]">
              <span>Settlement Currency:</span>
              <span className="text-[var(--surplus-line)] font-bold">USDG (6 Decimals)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Timelock Delay:</span>
              <span className="text-[var(--surplus-line)] font-bold">48 Hours (Multisig Guarded)</span>
            </div>
          </div>
        </div>
      )}

      {/* Buy Modal with Real Blockscout Explorer Link */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="surplus-window max-w-md w-full p-6 sm:p-7 rounded-2xl space-y-5 shadow-2xl animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-[var(--surplus-line-40)] pb-3">
              <h3 className="font-display font-medium text-lg text-[var(--surplus-line)]">Confirm Option Order</h3>
              <button
                onClick={() => setShowBuyModal(false)}
                className="text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)] p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--surplus-line-62)]">Asset:</span>
                <span className="text-[var(--surplus-line)] font-bold">{selectedStock.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--surplus-line-62)]">Contract:</span>
                <span className="text-[var(--surplus-line)]">{selectedSide === 'UP' ? 'Up (Call)' : 'Down (Put)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--surplus-line-62)]">Strike:</span>
                <span className="text-[var(--surplus-line)]">${selectedStrike.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--surplus-line-62)]">Units:</span>
                <span className="text-[var(--surplus-line)]">{tradeUnits} Tokens</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-[var(--surplus-line-40)]">
                <span className="text-[var(--surplus-line)]">Total Settlement:</span>
                <span className="text-emerald-400 font-tabular">${currentQuote.totalCostUsdg.toFixed(2)} USDG</span>
              </div>
            </div>

            {/* Stepper Status */}
            {buyStep === 'idle' && (
              <button
                onClick={handleExecuteBuy}
                className="stamp-btn py-3.5 w-full text-xs font-bold"
              >
                Approve USDG & Execute Buy
              </button>
            )}

            {buyStep === 'approving' && (
              <div className="flex items-center justify-center gap-2 py-3.5 text-xs font-mono text-[var(--surplus-line)]">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Step 1/2: Approving USDG allowance in wallet...</span>
              </div>
            )}

            {buyStep === 'approved' && (
              <div className="flex items-center justify-center gap-2 py-3.5 text-xs font-mono text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>USDG Approved! Confirming purchase in wallet...</span>
              </div>
            )}

            {buyStep === 'buying' && (
              <div className="flex items-center justify-center gap-2 py-3.5 text-xs font-mono text-[var(--surplus-line)]">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Step 2/2: Confirming transaction on Robinhood Chain...</span>
              </div>
            )}

            {buyStep === 'success' && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-[var(--surplus-line)]">
                    Option Bought Successfully!
                  </h4>
                  <p className="text-xs text-[var(--surplus-line-62)] mt-1 font-mono">
                    Minted {tradeUnits} {selectedStock.symbol} option tokens on Robinhood Chain.
                  </p>
                </div>

                {/* Blockscout Explorer Link */}
                {buyTxHash && (
                  <div className="p-3.5 rounded-xl border border-[var(--surplus-line-40)] bg-[var(--surplus-line-08)] text-xs font-mono space-y-2">
                    <div className="text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Confirmed on Robinhood Chain</span>
                    </div>
                    <a
                      href={getExplorerTxUrl(buyTxHash, chainId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surplus-line-14)] text-[var(--surplus-line)] border border-[var(--surplus-line-40)] text-xs font-bold hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] transition-all"
                    >
                      <span>View on Blockscout Explorer</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <div className="text-[10px] text-[var(--surplus-line-62)] truncate max-w-[280px] mx-auto">
                      Tx: {buyTxHash}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowBuyModal(false);
                      setActiveTab('positions');
                    }}
                    className="flex-1 stamp-btn py-2.5 text-xs font-bold"
                  >
                    View in Positions
                  </button>
                  <button
                    onClick={() => setShowBuyModal(false)}
                    className="py-2.5 px-4 rounded-lg border border-[var(--surplus-line-40)] text-[var(--surplus-line-80)] text-xs font-mono hover:text-[var(--surplus-line)]"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {buyStep === 'error' && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-[var(--surplus-line)]">Order Not Completed</h4>
                  <p className="text-xs text-rose-400 mt-1 font-mono">
                    {tradeError || 'Transaction was cancelled or rejected by wallet.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExecuteBuy}
                    className="flex-1 stamp-btn py-2.5 text-xs font-bold"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => setShowBuyModal(false)}
                    className="py-2.5 px-4 rounded-lg border border-[var(--surplus-line-40)] text-[var(--surplus-line-80)] text-xs font-mono hover:text-[var(--surplus-line)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* In-App Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl border shadow-xl backdrop-blur-md font-mono text-xs pointer-events-auto flex items-start gap-3 animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-[var(--surplus-ground)] border-emerald-500/40 text-[var(--surplus-line)]'
                : toast.type === 'warning'
                ? 'bg-[var(--surplus-ground)] border-amber-500/40 text-[var(--surplus-line)]'
                : toast.type === 'error'
                ? 'bg-[var(--surplus-ground)] border-rose-500/40 text-[var(--surplus-line)]'
                : 'bg-[var(--surplus-ground)] border-[var(--surplus-line-40)] text-[var(--surplus-line)]'
            }`}
          >
            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-current" />
            <div className="space-y-0.5 min-w-0">
              <div className="font-bold">{toast.title}</div>
              <div className="text-[11px] text-[var(--surplus-line-80)] leading-tight">{toast.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
