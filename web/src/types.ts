export type StockSymbol = 'NVDA' | 'TSLA' | 'SPY' | 'QQQ' | 'AAPL';
export type Speed = 'DAILY' | 'WEEKLY';
export type OptionSide = 'UP' | 'DOWN';
export type SessionKind = 'REGULAR' | 'EXTENDED' | 'CLOSED' | 'HALTED';

export interface StockInfo {
  symbol: StockSymbol;
  name: string;
  address: string;
  price?: number;
  change24h?: number;
  ivDailyBps?: number;
  ivWeeklyBps?: number;
}

export interface OptionSeries {
  id: string;
  stock: StockSymbol;
  isCall: boolean;
  speed: Speed;
  strike: number;
  tokenAddress: string;
  norm: number; // 0 to 1.0 (decays over time)
  lastAccrual: number;
  buyable: boolean;
}

export interface OptionQuote {
  spot: number;
  strike: number;
  speed: Speed;
  isCall: boolean;
  units: number;
  markPriceUsdg: number;
  spreadBps: number;
  feeUsdg: number;
  totalCostUsdg: number;
  delta: number;
  gamma: number;
  dailyDecayUsdg: number;
  breakeven: number;
}

export interface UserPosition {
  id: string;
  seriesId: string;
  stock: StockSymbol;
  isCall: boolean;
  speed: Speed;
  strike: number;
  rawTokens: number;
  norm: number;
  effectiveUnits: number;
  entryPriceUsdg: number;
  currentValueUsdg: number;
  pnlUsdg: number;
  pnlPct: number;
  boughtAt: number;
}

export interface WriterPoolStats {
  navUsdg: number;
  conservativeEntryNav: number;
  totalShares: number;
  navPerShare: number;
  openLiabilityUsdg: number;
  maxLiabilityCapacityUsdg: number;
  capacityUtilizationPct: number;
  usdgCash: number;
  spotHedgesUsdg: number;
  reserveUsdg: number;
  depositLockHours: number;
  withdrawalNoticeHours: number;
  claimWindowDays: number;
  aprPct: number;
}

export interface AgentPolicy {
  agentAddress: string;
  budgetUsdg: number;
  spentUsdg: number;
  maxPerTradeUsdg: number;
  expiresAt: number;
  canSell: boolean;
  canShield: boolean;
  allowedStocks: StockSymbol[];
  revoked: boolean;
}
