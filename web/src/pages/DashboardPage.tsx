import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Shield as ShieldIcon,
  Layers,
  Bot,
  Activity as ActivityIcon,
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
import { calculateScenarioPnL } from '../utils/pricing';
import { CHAIN_CONFIG, TESTNET_CHAIN_CONFIG } from '../data/protocol';
import { DEMO_POSITIONS, DEMO_POOL_STATS, DEMO_AGENT_POLICY, DEMO_ACTIVITIES } from '../data/demoFixtures';
import { getExplorerTxUrl } from '../config/wagmi';
import { applySurplusPalette } from '../data/surplusTheme';
import { useAccount, useSwitchChain, usePublicClient, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, zeroAddress } from 'viem';
import { C } from '../config/contracts';
import {
  ARCUM_ENGINE_ABI,
  WRITER_POOL_ABI,
  AGENT_ROUTER_ABI,
  ERC20_ABI,
} from '../contracts/abis';
import {
  useSeriesList,
  strikesFor,
  usePrices,
  useOnChainQuote,
  usePositions,
  OnChainPosition,
  useWithdrawTickets,
  useActivity,
  useOnChainPool,
  useOnChainAgentPolicy,
} from '../hooks/chain';
import { useTx } from '../hooks/useTx';

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

  const { chainId: walletChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: 46630 });
  const { send } = useTx();
  const isWrongChain = walletConnected && walletChainId !== 46630;

  const setActiveTab = (tab: string) => {
    setInternalTab(tab);
    applySurplusPalette(tab);
    if (onTabChange) onTabChange(tab);
  };

  useEffect(() => {
    applySurplusPalette(activeTab);
  }, [activeTab]);

  // Toast System
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
    }, 5000);
  };

  // -------------------------------------------------------------
  // 1. LIVE ON-CHAIN DATA HOOKS
  // -------------------------------------------------------------

  // 1.1 Prices from PriceGuard
  const { prices: livePrices } = usePrices(
    stocks.map((s) => ({ address: s.address as `0x${string}` }))
  );
  const currentPriceInfo = livePrices.find(
    (p) => p.address.toLowerCase() === selectedStock.address.toLowerCase()
  );
  const currentPrice = currentPriceInfo?.price ?? null;

  // 1.2 Listed Series & Strikes from SeriesRegistry
  const { series: allListedSeries } = useSeriesList();
  const [selectedSide, setSelectedSide] = useState<OptionSide>('UP');
  const [selectedSpeed, setSelectedSpeed] = useState<Speed>('DAILY');

  const tauSeconds = selectedSpeed === 'DAILY' ? 86400 : 604800;
  const availableSeries = strikesFor(
    allListedSeries,
    selectedStock.address,
    selectedSide === 'UP',
    tauSeconds
  );

  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);

  // Sync selected strike when series list changes
  useEffect(() => {
    if (availableSeries.length > 0) {
      if (!selectedStrike || !availableSeries.some((s) => s.strike === selectedStrike)) {
        setSelectedStrike(availableSeries[0].strike);
      }
    } else {
      setSelectedStrike(null);
    }
  }, [availableSeries, selectedStrike]);

  const activeSeries = availableSeries.find((s) => s.strike === selectedStrike) ?? availableSeries[0];
  const seriesId = activeSeries?.id;

  // 1.3 Trade Quantity & On-Chain Quote
  const [tradeUnits, setTradeUnits] = useState<number>(10);
  const tradeUnitsWad = parseUnits(String(tradeUnits || 0), 18);

  const { data: onChainQuote } = useOnChainQuote(seriesId, tradeUnitsWad, true);

  const quoteView = onChainQuote
    ? {
        totalUsdg: Number(formatUnits(onChainQuote.usdg, 6)),
        feeUsdg: Number(formatUnits(onChainQuote.feeUsdg, 6)),
        dailyCostUsdg: Number(formatUnits(onChainQuote.dailyCostUsdg, 6)),
        markPerUnit: Number(formatUnits(onChainQuote.vMarkWad, 18)),
        breakeven: Number(formatUnits(onChainQuote.breakevenWad, 18)),
        buyable: onChainQuote.buyable,
        rawUsdg: onChainQuote.usdg,
      }
    : null;

  const canBuy = !!activeSeries && !!quoteView?.buyable && !isWrongChain && walletConnected;

  // 1.4 Positions (On-Chain)
  const { positions: onChainPositions } = usePositions();
  const activeDisplayPositions = isDemoMode ? DEMO_POSITIONS : onChainPositions;

  // 1.5 Writer Pool (On-Chain)
  const { pool: livePool } = useOnChainPool(userAddress as `0x${string}` | undefined);
  const { data: withdrawTickets } = useWithdrawTickets();
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [withdrawShares, setWithdrawShares] = useState<number>(100);

  // 1.6 Agent Policy (On-Chain)
  const [agentAddr, setAgentAddr] = useState<string>('');
  const isValidAgentAddr = agentAddr.startsWith('0x') && agentAddr.length === 42;
  const { data: onChainPolicy } = useOnChainAgentPolicy(
    userAddress as `0x${string}` | undefined,
    isValidAgentAddr ? (agentAddr as `0x${string}`) : undefined
  );
  const { data: remainingBudget } = useReadContract({
    address: C.agentRouter,
    abi: AGENT_ROUTER_ABI,
    functionName: 'remainingBudget',
    args: userAddress && isValidAgentAddr ? [userAddress as `0x${string}`, agentAddr as `0x${string}`] : undefined,
    query: { enabled: !!userAddress && isValidAgentAddr },
  });

  // 1.7 Activity (On-Chain Event Logs)
  const { data: activityLogs } = useActivity();

  // 1.8 Shield Form State
  const [shieldQty, setShieldQty] = useState<string>('10');
  const [shieldPct, setShieldPct] = useState<number>(5);

  const { data: stockBal } = useReadContract({
    address: selectedStock.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: { enabled: !!userAddress },
  });

  const shieldQtyWad = shieldQty ? parseUnits(shieldQty, 18) : 0n;
  const stockBalRaw = (stockBal as bigint) ?? 0n;
  const overHolding = stockBalRaw !== undefined && shieldQtyWad > stockBalRaw;

  // Optimal listed put: largest strike <= target; fallback lowest strike
  const weeklyPuts = allListedSeries.filter(
    (s) =>
      s.stock.toLowerCase() === selectedStock.address.toLowerCase() &&
      !s.isCall &&
      s.tauSeconds === 604800 &&
      s.buyable &&
      !s.archived
  );
  const shieldTarget = currentPrice != null ? currentPrice * (1 - shieldPct / 100) : null;
  const shieldPick =
    shieldTarget == null
      ? undefined
      : weeklyPuts.filter((s) => s.strike <= shieldTarget).sort((a, b) => b.strike - a.strike)[0] ??
        [...weeklyPuts].sort((a, b) => a.strike - b.strike)[0];

  const { data: shieldQuote } = useOnChainQuote(shieldPick?.id, shieldQtyWad, true);
  const canShield =
    !!shieldPick &&
    !!shieldQuote?.buyable &&
    shieldQtyWad > 0n &&
    !overHolding &&
    walletConnected &&
    !isWrongChain;

  // What-If Simulator state
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [targetMovePct, setTargetMovePct] = useState<number>(5);
  const [scenarioDays, setScenarioDays] = useState<number>(3);
  const [showPoolStats, setShowPoolStats] = useState<boolean>(false);
  const [showBuyModal, setShowBuyModal] = useState<boolean>(false);

  // -------------------------------------------------------------
  // 2. TRANSACTION ACTION HANDLERS (useTx + Receipts)
  // -------------------------------------------------------------

  const handleExecuteBuy = async () => {
    if (!activeSeries || !quoteView || !userAddress || !publicClient) return;

    try {
      const maxCost = (quoteView.rawUsdg * 105n) / 100n;
      const allowance = await publicClient.readContract({
        address: C.usdg,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress as `0x${string}`, C.engine],
      });

      if (allowance < maxCost) {
        await send(
          {
            address: C.usdg,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [C.engine, maxCost],
          },
          'Approve USDG',
          showToast
        );
      }

      await send(
        {
          address: C.engine,
          abi: ARCUM_ENGINE_ABI,
          functionName: 'buy',
          args: [
            activeSeries.id,
            tradeUnitsWad,
            maxCost,
            BigInt(Math.floor(Date.now() / 1000) + 600),
            userAddress as `0x${string}`,
          ],
        },
        'Buy Option',
        showToast
      );

      setShowBuyModal(false);
    } catch (err) {
      console.error('Buy execution failed:', err);
    }
  };

  const handleClosePosition = async (pos: OnChainPosition) => {
    if (!pos.bidRaw || !userAddress) return;
    try {
      const minProceeds = (pos.bidRaw * 98n) / 100n; // 2% slippage protection
      await send(
        {
          address: C.engine,
          abi: ARCUM_ENGINE_ABI,
          functionName: 'sell',
          args: [
            pos.seriesId,
            pos.tokensRaw,
            minProceeds,
            BigInt(Math.floor(Date.now() / 1000) + 600),
            userAddress as `0x${string}`,
          ],
        },
        'Close Position',
        showToast
      );
    } catch (err) {
      console.error('Sell failed:', err);
    }
  };

  const handleExecuteShield = async () => {
    if (!shieldPick || !shieldQuote || !userAddress || !publicClient) return;

    try {
      const maxCost = (shieldQuote.usdg * 105n) / 100n;
      const allowance = await publicClient.readContract({
        address: C.usdg,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress as `0x${string}`, C.engine],
      });

      if (allowance < maxCost) {
        await send(
          {
            address: C.usdg,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [C.engine, maxCost],
          },
          'Approve USDG for Shield',
          showToast
        );
      }

      await send(
        {
          address: C.engine,
          abi: ARCUM_ENGINE_ABI,
          functionName: 'shield',
          args: [
            selectedStock.address as `0x${string}`,
            shieldQtyWad,
            Math.round(shieldPct * 100),
            maxCost,
            BigInt(Math.floor(Date.now() / 1000) + 600),
          ],
        },
        'Buy Shield Protection',
        showToast
      );
    } catch (err) {
      console.error('Shield failed:', err);
    }
  };

  const handleDepositPool = async () => {
    if (!userAddress || !publicClient || depositAmount <= 0) return;

    try {
      const assetsRaw = parseUnits(String(depositAmount), 6);
      const allowance = await publicClient.readContract({
        address: C.usdg,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress as `0x${string}`, C.writerPool],
      });

      if (allowance < assetsRaw) {
        await send(
          {
            address: C.usdg,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [C.writerPool, assetsRaw],
          },
          'Approve USDG for Pool',
          showToast
        );
      }

      await send(
        {
          address: C.writerPool,
          abi: WRITER_POOL_ABI,
          functionName: 'deposit',
          args: [assetsRaw, userAddress as `0x${string}`],
        },
        'Deposit Liquidity',
        showToast
      );
    } catch (err) {
      console.error('Deposit failed:', err);
    }
  };

  const handleRequestWithdraw = async () => {
    if (!userAddress || !livePool || withdrawShares <= 0) return;

    try {
      const sharesRaw = parseUnits(String(withdrawShares), 18);
      if (sharesRaw > livePool.myShares) {
        showToast('Withdrawal Error', 'Amount exceeds your available AWP shares.', 'error');
        return;
      }
      if (Date.now() < livePool.unlockAt) {
        showToast(
          'Withdrawal Locked',
          `Shares locked until ${new Date(livePool.unlockAt).toLocaleString()}`,
          'error'
        );
        return;
      }

      await send(
        {
          address: C.writerPool,
          abi: WRITER_POOL_ABI,
          functionName: 'requestWithdraw',
          args: [sharesRaw],
        },
        'Request Withdrawal Ticket',
        showToast
      );
    } catch (err) {
      console.error('Request withdraw failed:', err);
    }
  };

  const handleClaimTicket = async (ticketId: bigint) => {
    try {
      await send(
        {
          address: C.writerPool,
          abi: WRITER_POOL_ABI,
          functionName: 'claim',
          args: [ticketId],
        },
        'Claim Ticket',
        showToast
      );
    } catch (err) {
      console.error('Claim ticket failed:', err);
    }
  };

  const [policyBudget, setPolicyBudget] = useState<string>('500');
  const [policyMaxTrade, setPolicyMaxTrade] = useState<string>('100');
  const [policyDays, setPolicyDays] = useState<number>(7);
  const [canSellPolicy, setCanSellPolicy] = useState<boolean>(true);
  const [canShieldPolicy, setCanShieldPolicy] = useState<boolean>(true);

  const handleSetPolicy = async () => {
    if (!isValidAgentAddr || !userAddress || !publicClient) {
      showToast('Policy Error', 'Enter a valid agent 0x address first.', 'error');
      return;
    }
    try {
      const budgetRaw = parseUnits(policyBudget, 6);
      const maxTradeRaw = parseUnits(policyMaxTrade, 6);
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + policyDays * 86400);
      const allowedStocks = stocks.map((s) => s.address as `0x${string}`);

      const allowance = await publicClient.readContract({
        address: C.usdg,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress as `0x${string}`, C.agentRouter],
      });

      if (allowance < budgetRaw) {
        await send(
          {
            address: C.usdg,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [C.agentRouter, budgetRaw],
          },
          'Approve USDG for Agent',
          showToast
        );
      }

      await send(
        {
          address: C.agentRouter,
          abi: AGENT_ROUTER_ABI,
          functionName: 'setPolicy',
          args: [
            agentAddr as `0x${string}`,
            budgetRaw,
            maxTradeRaw,
            expiresAt,
            canSellPolicy,
            canShieldPolicy,
            allowedStocks,
          ],
        },
        'Set Agent Policy',
        showToast
      );
    } catch (err) {
      console.error('Set policy failed:', err);
    }
  };

  const handleRevokeAgent = async () => {
    if (!isValidAgentAddr) {
      showToast('Revoke Error', 'Please enter a valid agent 0x address.', 'error');
      return;
    }
    try {
      await send(
        {
          address: C.agentRouter,
          abi: AGENT_ROUTER_ABI,
          functionName: 'revoke',
          args: [agentAddr as `0x${string}`],
        },
        'Revoke Agent Policy',
        showToast
      );
    } catch (err) {
      console.error('Revoke agent failed:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 font-mono text-[var(--surplus-line)]">
      {/* ZERO POOL WARNING BANNER */}
      {livePool && livePool.navUsdg < 1 && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Writer Pool is currently empty. Option purchases are constrained until writers deposit USDG liquidity.</span>
        </div>
      )}

      {/* TAB 1: TRADE OPTIONS */}
      {activeTab === 'trade' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT: ORDER SLIP */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--surplus-line-62)]">
                Robinhood Chain Testnet (46630)
              </span>
              <h1 className="text-3xl sm:text-4xl font-display font-medium tracking-tight text-[var(--surplus-line)]">
                Buy Everlasting Option
              </h1>
              <p className="text-xs sm:text-sm text-[var(--surplus-line-80)] font-mono max-w-xl">
                Non-expiring continuous options backed by live on-chain solvency and PriceGuard feeds.
              </p>
            </div>

            {/* Asset Selection Bar */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-[var(--surplus-line-62)] flex justify-between">
                <span>Select Underlying Equity:</span>
                <span>
                  Price:{' '}
                  <strong className="text-emerald-400 font-tabular">
                    {currentPrice != null ? `$${currentPrice.toFixed(2)}` : '—'}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                {stocks.map((stock) => {
                  const isSel = selectedStock.symbol === stock.symbol;
                  const pObj = livePrices.find(
                    (p) => p.address.toLowerCase() === stock.address.toLowerCase()
                  );
                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => onSelectStock(stock)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all shrink-0 border ${
                        isSel
                          ? 'border-[var(--surplus-line)] bg-[var(--surplus-line)] text-[var(--surplus-ground)] font-bold shadow-sm'
                          : 'border-[var(--surplus-line-24)] text-[var(--surplus-line-80)] hover:border-[var(--surplus-line-62)]'
                      }`}
                    >
                      <span>{stock.symbol}</span>
                      <span className="font-tabular font-medium">
                        {pObj?.price != null ? `$${pObj.price.toFixed(2)}` : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direction & Speed Selector */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Units Input */}
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
                  style={{ color: 'var(--surplus-line)' }}
                />
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--surplus-line-62)] shrink-0">
                  Tokens
                </span>
              </div>
            </div>

            {/* Strike Selection from On-Chain Registry */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--surplus-line-62)]">
                <span>Listed On-Chain Strikes (Registry):</span>
                <span>{availableSeries.length} Listed Series</span>
              </div>

              {availableSeries.length === 0 ? (
                <div className="p-8 text-center border border-[var(--surplus-line-24)] rounded-2xl text-xs font-mono text-[var(--surplus-line-62)]">
                  No listed series available for {selectedStock.symbol} {selectedSide} ({selectedSpeed}) on-chain.
                </div>
              ) : (
                <div className="border border-[var(--surplus-line-24)] rounded-2xl overflow-hidden divide-y divide-[var(--surplus-line-14)] font-mono text-xs">
                  {availableSeries.map((s) => {
                    const isSelected = selectedStrike === s.strike;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStrike(s.strike)}
                        className={`p-3.5 sm:p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[var(--surplus-line-14)] border-l-4 border-l-[var(--surplus-line)]'
                            : 'hover:bg-[var(--surplus-line-08)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <span className="font-bold text-sm sm:text-base text-[var(--surplus-line)] font-sans">
                            ${s.strike.toFixed(2)}
                          </span>
                          {currentPrice != null && Math.abs(s.strike - currentPrice) < 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              ATM
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-[var(--surplus-line-62)] block font-mono">
                            Series: {s.id.slice(0, 8)}…{s.id.slice(-6)}
                          </span>
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
              )}
            </div>

            {/* What-If Simulator */}
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

              {showSimulator && currentPrice != null && selectedStrike != null && (
                <div className="p-5 border-t border-[var(--surplus-line-14)] bg-[var(--surplus-line-08)] space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[var(--surplus-line-62)]">Target Move (%):</span>
                        <span className="text-[var(--surplus-line)] font-bold">
                          {targetMovePct >= 0 ? '+' : ''}{targetMovePct}%
                        </span>
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

                  {(() => {
                    const scenario = calculateScenarioPnL(
                      currentPrice,
                      selectedStrike,
                      5000,
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
                          <div
                            className={`text-sm font-bold font-tabular ${
                              scenario.netPnlUsdg >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
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

          {/* RIGHT: ORDER SUMMARY (ON-CHAIN QUOTE) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            <div className="surplus-window p-6 sm:p-7 rounded-2xl space-y-6">
              <div className="border-b border-[var(--surplus-line-40)] pb-4 flex justify-between items-baseline">
                <div>
                  <h3 className="font-display font-medium text-xl text-[var(--surplus-line)]">
                    Order Summary
                  </h3>
                  <div className="text-xs font-mono text-[var(--surplus-line-62)]">
                    {selectedStock.symbol} • {selectedStrike != null ? `$${selectedStrike.toFixed(2)}` : '—'} • {selectedSide === 'UP' ? 'Up (Call)' : 'Down (Put)'}
                  </div>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded border border-[var(--surplus-line-40)] font-bold text-[var(--surplus-line)]">
                  {selectedSpeed}
                </span>
              </div>

              {/* Live Dot-Leader Pricing Rows */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Underlying Spot:</span>
                  <div className="dot-leader" />
                  <span className="text-[var(--surplus-line)] font-tabular">
                    {currentPrice != null ? `$${currentPrice.toFixed(2)}` : '—'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Strike Price (K):</span>
                  <div className="dot-leader" />
                  <span className="text-[var(--surplus-line)] font-tabular">
                    {selectedStrike != null ? `$${selectedStrike.toFixed(2)}` : '—'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Units to Mint:</span>
                  <div className="dot-leader" />
                  <span className="text-[var(--surplus-line)] font-bold font-tabular">{tradeUnits} Tokens</span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Mark Price (Unit):</span>
                  <div className="dot-leader" />
                  <span className="text-[var(--surplus-line)] font-tabular">
                    {quoteView ? `${quoteView.markPerUnit.toFixed(3)} USDG` : '—'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Est. Daily Holding Cost:</span>
                  <div className="dot-leader" />
                  <span className="text-amber-400 font-tabular">
                    {quoteView ? `-$${quoteView.dailyCostUsdg.toFixed(3)} / day` : '—'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--surplus-line-62)]">Protocol Fee (3 bps):</span>
                  <div className="dot-leader" />
                  <span className="text-[var(--surplus-line)] font-tabular">
                    {quoteView ? `$${quoteView.feeUsdg.toFixed(3)} USDG` : '—'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 pt-3 border-t border-[var(--surplus-line-40)] text-sm font-bold">
                  <span className="text-[var(--surplus-line)]">Total Settlement:</span>
                  <div className="dot-leader" />
                  <span className="text-emerald-400 font-tabular text-base">
                    {quoteView ? `$${quoteView.totalUsdg.toFixed(2)} USDG` : '—'}
                  </span>
                </div>
              </div>

              {/* Network / Wallet Status */}
              <div className="p-3 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${walletConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-[var(--surplus-line-62)] shrink-0">Wallet:</span>
                  <span className="text-[var(--surplus-line)] font-bold truncate">
                    {userAddress ? `${userAddress.slice(0, 6)}…${userAddress.slice(-4)}` : 'Not Connected'}
                  </span>
                </div>
                <span className="text-[var(--surplus-line)] font-bold shrink-0">
                  {isWrongChain ? 'Wrong Chain' : '46630'}
                </span>
              </div>

              {/* Action Button */}
              {!walletConnected ? (
                <button
                  type="button"
                  onClick={onConnectWallet}
                  className="stamp-btn py-4 w-full text-xs sm:text-sm tracking-wider"
                >
                  <span>Connect Wallet to Trade</span>
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </button>
              ) : isWrongChain ? (
                <button
                  type="button"
                  onClick={() => switchChain?.({ chainId: 46630 })}
                  className="stamp-btn py-4 w-full text-xs sm:text-sm tracking-wider text-amber-300 border-amber-400/60 hover:bg-amber-500/20"
                >
                  <span>Switch to Robinhood Testnet (46630)</span>
                  <RefreshCw className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => setShowBuyModal(true)}
                  className={`stamp-btn py-4 w-full text-xs sm:text-sm tracking-wider ${
                    !canBuy ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <span>Buy Everlasting Option</span>
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </button>
              )}

              {/* H10: Writer Pool Risk Cap reading on-chain maxOutstandingBps */}
              <div className="pt-2 border-t border-[var(--surplus-line-24)]">
                <button
                  type="button"
                  onClick={() => setShowPoolStats(!showPoolStats)}
                  className="w-full flex items-center justify-between text-[11px] font-mono text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)]"
                >
                  <span>
                    Writer Pool Risk Cap:{' '}
                    <strong>{livePool ? `${livePool.riskCapPct.toFixed(1)}% NAV` : '—'}</strong>
                  </span>
                  {showPoolStats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showPoolStats && livePool && (
                  <div className="mt-3 p-3 rounded-lg border border-[var(--surplus-line-14)] space-y-2 text-[11px] font-mono text-[var(--surplus-line-80)]">
                    <div className="flex justify-between">
                      <span>Total Pool NAV:</span>
                      <span className="font-tabular font-bold">${livePool.navUsdg.toLocaleString()} USDG</span>
                    </div>
                    <div className="flex justify-between">
                      <span>NAV per Share:</span>
                      <span className="font-tabular font-bold">${livePool.navPerShare.toFixed(4)} USDG</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Open Liability:</span>
                      <span className="font-tabular">${livePool.liabilityUsdg.toLocaleString()} USDG</span>
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
                Decaying positions track in-kind funding via series normalization factor (Norm).
              </p>
            </div>
            <button onClick={() => setActiveTab('trade')} className="stamp-btn py-2 px-4 text-xs">
              Open New Position
            </button>
          </div>

          {activeDisplayPositions.length === 0 ? (
            <div className="p-12 text-center border border-[var(--surplus-line-24)] rounded-2xl space-y-3 font-mono text-xs text-[var(--surplus-line-62)]">
              <p>No open everlasting options positions in this account.</p>
              <button
                onClick={() => setActiveTab('trade')}
                className="stamp-btn py-2.5 px-5 text-xs cursor-pointer"
              >
                Go to Trading Terminal
              </button>
            </div>
          ) : (
            <div className="border border-[var(--surplus-line-24)] rounded-2xl overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] text-[var(--surplus-line-62)]">
                  <tr>
                    <th className="p-3.5 font-normal">Asset & Side</th>
                    <th className="p-3.5 font-normal">Strike</th>
                    <th className="p-3.5 font-normal">Speed</th>
                    <th className="p-3.5 font-normal text-right">Raw Tokens</th>
                    <th className="p-3.5 font-normal text-right">Norm</th>
                    <th className="p-3.5 font-normal text-right">Effective Units</th>
                    <th className="p-3.5 font-normal text-right">Value (Bid)</th>
                    <th className="p-3.5 font-normal text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surplus-line-14)]">
                  {activeDisplayPositions.map((pos) => {
                    const isCall = pos.isCall;
                    const stockSym = pos.stock;
                    return (
                      <tr key={pos.seriesId} className="hover:bg-[var(--surplus-line-08)] transition-colors">
                        <td className="p-3.5 font-bold text-[var(--surplus-line)]">
                          {stockSym} {isCall ? 'UP (Call)' : 'DOWN (Put)'}
                        </td>
                        <td className="p-3.5 font-tabular">${pos.strike.toFixed(2)}</td>
                        <td className="p-3.5">{pos.speed}</td>
                        <td className="p-3.5 text-right font-tabular">{pos.rawTokens.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-tabular text-amber-400">{pos.norm.toFixed(4)}</td>
                        <td className="p-3.5 text-right font-tabular">{pos.effectiveUnits.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-tabular font-bold">
                          ${pos.currentValueUsdg.toFixed(2)} USDG
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleClosePosition(pos as OnChainPosition)}
                            className="px-3 py-1 rounded border border-[var(--surplus-line-40)] text-[var(--surplus-line)] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] font-bold transition-all"
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
          )}
        </div>
      )}

      {/* TAB 3: SHIELD (H12, H21 RESOLVED) */}
      {activeTab === 'shield' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-1">
            <h2 className="text-2xl font-display font-medium text-[var(--surplus-line)]">
              Shield: Weekly Put Protection
            </h2>
            <p className="text-xs font-mono text-[var(--surplus-line-62)]">
              Buy a listed weekly put sized to your Stock Token holding.
            </p>
          </div>

          <div className="surplus-window p-6 sm:p-8 rounded-2xl space-y-6 font-mono text-xs">
            <div className="space-y-2">
              <span className="text-[var(--surplus-line-62)]">Select Equity to Protect:</span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {stocks.map((stock) => {
                  const pObj = livePrices.find(
                    (p) => p.address.toLowerCase() === stock.address.toLowerCase()
                  );
                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => onSelectStock(stock)}
                      className={`px-4 py-2 rounded-xl border ${
                        selectedStock.symbol === stock.symbol
                          ? 'bg-[var(--surplus-line)] text-[var(--surplus-ground)] font-bold border-[var(--surplus-line)]'
                          : 'border-[var(--surplus-line-24)] text-[var(--surplus-line-80)]'
                      }`}
                    >
                      {stock.symbol} ({pObj?.price != null ? `$${pObj.price.toFixed(2)}` : '—'})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs: Units & Protection Percentage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[var(--surplus-line-62)]">Stock Tokens to Protect:</span>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={shieldQty}
                  onChange={(e) => setShieldQty(e.target.value)}
                  placeholder="Stock tokens to protect"
                  className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-xl p-3 text-lg font-bold text-[var(--surplus-line)] focus:outline-none"
                  style={{ color: 'var(--surplus-line)' }}
                />
                <small className="text-[var(--surplus-line-62)] block">
                  You hold: {stockBal !== undefined ? formatUnits(stockBal as bigint, 18) : '—'} {selectedStock.symbol}
                </small>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--surplus-line-62)]">Protection Level (% below spot):</span>
                  <span className="text-[var(--surplus-line)] font-bold">{shieldPct}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={shieldPct}
                  onChange={(e) => setShieldPct(parseInt(e.target.value) || 5)}
                  className="w-full accent-amber-400 mt-3"
                />
                <small className="text-[var(--surplus-line-62)] block">
                  Target Strike: {shieldTarget != null ? `$${shieldTarget.toFixed(2)}` : '—'}
                </small>
              </div>
            </div>

            {/* Pricing Ledger */}
            <div className="p-4 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[var(--surplus-line-62)]">Listed Weekly Put Selected:</span>
                <span className="text-[var(--surplus-line)] font-bold text-sm">
                  {shieldPick ? `$${shieldPick.strike.toFixed(2)} Strike (${shieldPick.id.slice(0, 8)}…)` : 'No listed put'}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[var(--surplus-line-62)]">Protection Cost:</span>
                <span className="text-emerald-400 font-bold">
                  {shieldQuote ? `$${Number(formatUnits(shieldQuote.usdg, 6)).toFixed(2)} USDG` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[var(--surplus-line-62)]">Daily Holding Cost:</span>
                <span className="text-amber-400 font-bold">
                  {shieldQuote ? `-$${Number(formatUnits(shieldQuote.dailyCostUsdg, 6)).toFixed(3)} / day` : '—'}
                </span>
              </div>
            </div>

            {overHolding && (
              <p className="text-rose-400 font-bold text-xs">
                Requested units exceed your {selectedStock.symbol} token holding.
              </p>
            )}

            <p className="text-xs opacity-70 text-[var(--surplus-line-62)]">
              Shield buys a decaying weekly put. It is not a permanent price floor and does not renew automatically.
            </p>

            <button
              onClick={handleExecuteShield}
              disabled={!canShield}
              className={`stamp-btn py-4 w-full text-xs sm:text-sm ${
                !canShield ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <span>Buy Shield Protection</span>
              <ShieldIcon className="w-4 h-4 ml-2" />
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
              Underwrite everlasting option liability, earn protocol spread & funding, and manage withdrawal queues.
            </p>
          </div>

          {/* Pool Stats Card */}
          {livePool && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] font-mono text-xs">
              <div>
                <span className="text-[var(--surplus-line-62)] block">Pool NAV</span>
                <span className="text-base font-bold text-[var(--surplus-line)]">
                  ${livePool.navUsdg.toLocaleString()} USDG
                </span>
              </div>
              <div>
                <span className="text-[var(--surplus-line-62)] block">NAV per Share</span>
                <span className="text-base font-bold text-[var(--surplus-line)]">
                  ${livePool.navPerShare.toFixed(4)} USDG
                </span>
              </div>
              <div>
                <span className="text-[var(--surplus-line-62)] block">Your Shares</span>
                <span className="text-base font-bold text-emerald-400">
                  {livePool.mySharesFormatted.toFixed(4)} AWP
                </span>
              </div>
              <div>
                <span className="text-[var(--surplus-line-62)] block">Lock Period</span>
                <span className="text-base font-bold text-[var(--surplus-line)]">
                  {livePool.lockMinutes} Minutes
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs">
            {/* Deposit Box */}
            <div className="surplus-window p-6 rounded-2xl space-y-5">
              <h3 className="text-base font-display font-medium text-[var(--surplus-line)]">
                Deposit USDG Liquidity
              </h3>
              <div className="space-y-2">
                <span className="text-[var(--surplus-line-62)]">Deposit Amount (USDG):</span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-xl p-3 text-lg font-bold text-[var(--surplus-line)] focus:outline-none"
                  style={{ color: 'var(--surplus-line)' }}
                />
              </div>
              <div className="text-[11px] text-[var(--surplus-line-62)] space-y-1">
                <div>• Deposit lock: {livePool ? `${livePool.lockMinutes} min` : '30 min'} (on-chain).</div>
                <div>• Captures 48% LP fee share + 10 bps anti-dilution entry.</div>
              </div>
              <button
                onClick={handleDepositPool}
                disabled={!walletConnected || isWrongChain || depositAmount <= 0}
                className="stamp-btn py-3.5 w-full text-xs font-bold"
              >
                Deposit & Mint AWP Shares
              </button>
            </div>

            {/* Withdraw Box */}
            <div className="surplus-window p-6 rounded-2xl space-y-5">
              <div className="flex justify-between items-baseline">
                <h3 className="text-base font-display font-medium text-[var(--surplus-line)]">
                  Request Withdrawal
                </h3>
                {livePool && (
                  <button
                    onClick={() => setWithdrawShares(livePool.mySharesFormatted)}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    Max: {livePool.mySharesFormatted.toFixed(2)}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <span className="text-[var(--surplus-line-62)]">Shares to Redeem (18 dp):</span>
                <input
                  type="number"
                  value={withdrawShares}
                  onChange={(e) => setWithdrawShares(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-xl p-3 text-lg font-bold text-[var(--surplus-line)] focus:outline-none"
                  style={{ color: 'var(--surplus-line)' }}
                />
              </div>
              <div className="text-[11px] text-[var(--surplus-line-62)] space-y-1">
                <div>• Queue notice delay is enforced on-chain.</div>
                <div>• Claim window: 7 days. After window passes, claiming requeues the ticket.</div>
              </div>
              <button
                onClick={handleRequestWithdraw}
                disabled={!walletConnected || isWrongChain || withdrawShares <= 0}
                className="stamp-btn py-3.5 w-full text-xs font-bold"
              >
                Request Withdrawal Ticket
              </button>
            </div>
          </div>

          {/* Withdrawal Tickets Queue Table */}
          <div className="space-y-3 font-mono text-xs">
            <h3 className="text-lg font-display font-medium text-[var(--surplus-line)]">
              Your Withdrawal Tickets
            </h3>
            {(!withdrawTickets || withdrawTickets.length === 0) ? (
              <div className="p-8 text-center border border-[var(--surplus-line-24)] rounded-2xl text-[var(--surplus-line-62)]">
                No active withdrawal tickets queued for this wallet.
              </div>
            ) : (
              <div className="border border-[var(--surplus-line-24)] rounded-2xl overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] text-[var(--surplus-line-62)]">
                    <tr>
                      <th className="p-3.5">Ticket #</th>
                      <th className="p-3.5">Queued Shares</th>
                      <th className="p-3.5">Claimable At</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--surplus-line-14)]">
                    {withdrawTickets.map((t) => (
                      <tr key={String(t.id)} className="hover:bg-[var(--surplus-line-08)]">
                        <td className="p-3.5 font-bold">#{String(t.id)}</td>
                        <td className="p-3.5 font-tabular">{formatUnits(t.shares, 18)} AWP</td>
                        <td className="p-3.5 font-tabular">
                          {new Date(t.claimableAt * 1000).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          {t.status === 'waiting' && (
                            <span className="text-amber-400">Waiting notice delay</span>
                          )}
                          {t.status === 'claimable' && (
                            <span className="text-emerald-400 font-bold">Ready to claim</span>
                          )}
                          {t.status === 'expired' && (
                            <span className="text-rose-400">Expired (will requeue on claim)</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            disabled={t.status === 'waiting'}
                            onClick={() => handleClaimTicket(t.id)}
                            className={`px-3 py-1 rounded border font-bold ${
                              t.status === 'waiting'
                                ? 'opacity-40 cursor-not-allowed border-[var(--surplus-line-24)]'
                                : t.status === 'expired'
                                ? 'border-amber-400 text-amber-300 hover:bg-amber-500/20'
                                : 'border-emerald-400 text-emerald-300 hover:bg-emerald-500/20'
                            }`}
                          >
                            {t.status === 'expired' ? 'Requeue' : 'Claim'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: AI AGENTS */}
      {activeTab === 'agents' && (
        <div className="max-w-3xl mx-auto space-y-6 font-mono text-xs">
          <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-1">
            <h2 className="text-2xl font-display font-medium text-[var(--surplus-line)]">
              AI Agents & Delegation Policies
            </h2>
            <p className="text-[var(--surplus-line-62)]">
              Autonomous trading via bounded on-chain policies on AgentRouter.sol.
            </p>
          </div>

          <div className="surplus-window p-6 rounded-2xl space-y-5">
            <div className="space-y-2">
              <span className="text-[var(--surplus-line-62)]">Agent Address (0x…):</span>
              <input
                type="text"
                placeholder="0x…"
                value={agentAddr}
                onChange={(e) => setAgentAddr(e.target.value.trim())}
                className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-xl p-3 text-sm font-bold text-[var(--surplus-line)] focus:outline-none"
                style={{ color: 'var(--surplus-line)' }}
              />
            </div>

            {isValidAgentAddr && onChainPolicy && onChainPolicy.agent !== zeroAddress ? (
              <div className="space-y-4 pt-3 border-t border-[var(--surplus-line-24)]">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm">Policy Status</div>
                  <span
                    className={`px-3 py-1 rounded-lg font-bold ${
                      onChainPolicy.revoked
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : Number(onChainPolicy.expiresAt) * 1000 < Date.now()
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {onChainPolicy.revoked
                      ? 'REVOKED'
                      : Number(onChainPolicy.expiresAt) * 1000 < Date.now()
                      ? 'EXPIRED'
                      : 'ACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)]">
                    <div className="text-[10px] text-[var(--surplus-line-62)]">Budget Allocated</div>
                    <div className="text-sm font-bold text-[var(--surplus-line)] font-tabular">
                      {formatUnits(onChainPolicy.budgetUsdg, 6)} USDG
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)]">
                    <div className="text-[10px] text-[var(--surplus-line-62)]">Budget Remaining</div>
                    <div className="text-sm font-bold text-emerald-400 font-tabular">
                      {remainingBudget !== undefined ? `${formatUnits(remainingBudget as bigint, 6)} USDG` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)]">
                    <div className="text-[10px] text-[var(--surplus-line-62)]">Max Per Trade</div>
                    <div className="text-sm font-bold text-[var(--surplus-line)] font-tabular">
                      {formatUnits(onChainPolicy.maxPerTradeUsdg, 6)} USDG
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)]">
                    <div className="text-[10px] text-[var(--surplus-line-62)]">Expiry Date</div>
                    <div className="text-sm font-bold text-[var(--surplus-line)] font-tabular">
                      {new Date(Number(onChainPolicy.expiresAt) * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRevokeAgent}
                  disabled={onChainPolicy.revoked}
                  className={`stamp-btn py-3 w-full text-xs font-bold text-rose-300 border-rose-400/60 hover:bg-rose-500/20 ${
                    onChainPolicy.revoked ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  Revoke Autonomous Trading Authority (On-Chain Tx)
                </button>
              </div>
            ) : isValidAgentAddr ? (
              <div className="p-5 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] space-y-4">
                <div className="font-bold text-sm text-[var(--surplus-line)]">Grant New Agent Delegation Policy</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[var(--surplus-line-62)]">Total Budget (USDG):</span>
                    <input
                      type="number"
                      value={policyBudget}
                      onChange={(e) => setPolicyBudget(e.target.value)}
                      className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-lg p-2 text-xs font-bold text-[var(--surplus-line)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[var(--surplus-line-62)]">Max Per Trade (USDG):</span>
                    <input
                      type="number"
                      value={policyMaxTrade}
                      onChange={(e) => setPolicyMaxTrade(e.target.value)}
                      className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-lg p-2 text-xs font-bold text-[var(--surplus-line)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[var(--surplus-line-62)]">Validity (Days):</span>
                    <input
                      type="number"
                      value={policyDays}
                      onChange={(e) => setPolicyDays(parseInt(e.target.value) || 7)}
                      className="w-full bg-[var(--surplus-line-08)] border border-[var(--surplus-line-40)] rounded-lg p-2 text-xs font-bold text-[var(--surplus-line)]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canSellPolicy}
                      onChange={(e) => setCanSellPolicy(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>Allow Sell / Close</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canShieldPolicy}
                      onChange={(e) => setCanShieldPolicy(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>Allow Shield</span>
                  </label>
                </div>

                <button
                  onClick={handleSetPolicy}
                  className="stamp-btn py-3 w-full text-xs font-bold"
                >
                  Grant Agent Policy (On-Chain Tx)
                </button>
              </div>
            ) : null}

            {/* MCP Developer Instructions (H8: package not yet on npm, provide local execution docs) */}
            <div className="pt-4 border-t border-[var(--surplus-line-24)] space-y-2">
              <span className="font-bold text-[var(--surplus-line)]">Local MCP Server:</span>
              <p className="text-[11px] text-[var(--surplus-line-62)]">
                Run the local Arcum MCP agent tool via Bun/Node:
              </p>
              <div className="p-3 rounded-lg bg-[var(--surplus-line-08)] border border-[var(--surplus-line-24)] font-mono text-[11px] text-amber-300">
                bun run app/src/mcp/server.ts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ACTIVITY (ON-CHAIN GETLOGS) */}
      {activeTab === 'activity' && (
        <div className="space-y-6 font-mono text-xs">
          <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-1">
            <h2 className="text-2xl font-display font-medium text-[var(--surplus-line)]">
              Protocol Activity & Receipts
            </h2>
            <p className="text-[var(--surplus-line-62)]">
              Direct on-chain events indexed from Robinhood Chain Testnet (46630).
            </p>
          </div>

          {(!activityLogs || activityLogs.length === 0) ? (
            <div className="border border-[var(--surplus-line-24)] rounded-2xl p-12 text-center space-y-3 font-mono">
              <div className="text-[var(--surplus-line)] font-bold text-sm">No Recorded Wallet Activity</div>
              <p className="text-[var(--surplus-line-62)] text-xs max-w-md mx-auto">
                Live trade logs (Bought, Sold, ShieldBought, WithdrawalQueued, Claimed) for your wallet address will stream here once executed.
              </p>
            </div>
          ) : (
            <div className="border border-[var(--surplus-line-24)] rounded-2xl overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] text-[var(--surplus-line-62)]">
                  <tr>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Settlement (USDG)</th>
                    <th className="p-3.5">Block Number</th>
                    <th className="p-3.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surplus-line-14)]">
                  {activityLogs.map((a, idx) => (
                    <tr key={`${a.tx}-${idx}`} className="hover:bg-[var(--surplus-line-08)]">
                      <td className="p-3.5 font-bold text-[var(--surplus-line)]">{a.kind}</td>
                      <td className="p-3.5 font-tabular">
                        {a.usdg != null ? (
                          <span className={a.usdg > 0 ? 'text-emerald-400' : 'text-[var(--surplus-line)]'}>
                            {a.usdg > 0 ? '+' : ''}${a.usdg.toFixed(2)} USDG
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3.5 font-tabular text-[var(--surplus-line-62)]">#{String(a.block)}</td>
                      <td className="p-3.5 text-right">
                        <a
                          href={`https://explorer.testnet.chain.robinhood.com/tx/${a.tx}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:underline flex items-center justify-end gap-1"
                        >
                          <span>Explorer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: SETTINGS (ACCURATE DISCLAIMERS - ITEM L & Q) */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-6 font-mono text-xs">
          <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-1">
            <h2 className="text-2xl font-display font-medium text-[var(--surplus-line)]">
              Workspace Settings
            </h2>
            <p className="text-[var(--surplus-line-62)]">Testnet network parameters and contract ownership.</p>
          </div>

          <div className="surplus-window p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-[var(--surplus-line-14)]">
              <span>Active RPC Endpoint:</span>
              <span className="text-emerald-400 font-bold">https://rpc.testnet.chain.robinhood.com</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[var(--surplus-line-14)]">
              <span>Settlement Currency:</span>
              <span className="text-[var(--surplus-line)] font-bold">USDG (6 Decimals)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Timelock Delay:</span>
              <span className="text-amber-400 font-bold">Testnet owner: EOA. Timelock not deployed yet.</span>
            </div>
          </div>
        </div>
      )}

      {/* Buy Confirmation Modal */}
      {showBuyModal && activeSeries && quoteView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="surplus-window max-w-md w-full p-6 sm:p-7 rounded-2xl space-y-5 shadow-2xl animate-in zoom-in-95 duration-250 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--surplus-line-40)] pb-3">
              <h3 className="font-display font-medium text-lg text-[var(--surplus-line)]">Confirm Option Order</h3>
              <button
                onClick={() => setShowBuyModal(false)}
                className="text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)] p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
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
                <span className="text-[var(--surplus-line)]">${activeSeries.strike.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--surplus-line-62)]">Units:</span>
                <span className="text-[var(--surplus-line)]">{tradeUnits} Tokens</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-[var(--surplus-line-40)]">
                <span className="text-[var(--surplus-line)]">Total Settlement:</span>
                <span className="text-emerald-400 font-tabular">${quoteView.totalUsdg.toFixed(2)} USDG</span>
              </div>
            </div>

            <button
              onClick={handleExecuteBuy}
              className="stamp-btn py-3.5 w-full text-xs font-bold"
            >
              Approve USDG & Execute Buy
            </button>
          </div>
        </div>
      )}

      {/* Floating Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl border shadow-xl backdrop-blur-md font-mono text-xs pointer-events-auto transition-all animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200'
                : toast.type === 'error'
                ? 'border-rose-500/40 bg-rose-950/80 text-rose-200'
                : 'border-amber-500/40 bg-amber-950/80 text-amber-200'
            }`}
          >
            <div className="font-bold text-sm mb-1">{toast.title}</div>
            <div className="text-[11px] opacity-90 break-words">{toast.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
