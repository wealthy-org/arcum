import { UserPosition, WriterPoolStats, AgentPolicy } from '../types';

export const DEMO_POSITIONS: UserPosition[] = [
  {
    id: 'demo-pos-1',
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
    id: 'demo-pos-2',
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
];

export const DEMO_POOL_STATS: WriterPoolStats = {
  navUsdg: 2500000.0,
  conservativeEntryNav: 2497500.0,
  totalShares: 2450000.0,
  navPerShare: 1.0204,
  openLiabilityUsdg: 435000.0,
  maxLiabilityCapacityUsdg: 875000.0,
  capacityUtilizationPct: 49.7,
  usdgCash: 1850000.0,
  spotHedgesUsdg: 580000.0,
  reserveUsdg: 125000.0,
  depositLockHours: 24,
  withdrawalNoticeHours: 72,
  claimWindowDays: 7,
  aprPct: 18.4,
};

export const DEMO_AGENT_POLICY: AgentPolicy = {
  agentAddress: '0x8b32A4A87C1f240E96EFE099b2944bF956fA5001',
  budgetUsdg: 5000.0,
  spentUsdg: 1250.0,
  maxPerTradeUsdg: 500.0,
  expiresAt: Math.floor(Date.now() / 1000) + 86400 * 14,
  canSell: true,
  canShield: true,
  allowedStocks: ['NVDA', 'TSLA', 'AAPL'],
  revoked: false,
};

export interface ActivityItem {
  id: string;
  title: string;
  block: string;
  txHash?: string;
  time: string;
}

export const DEMO_ACTIVITIES: ActivityItem[] = [
  { id: '1', title: 'Bought 50.0 NVDA Up Options (Daily)', block: 'Block #18,942,109', time: '10m ago' },
  { id: '2', title: 'Deposited 5,000 USDG to Writer Pool', block: 'Block #18,935,441', time: '2h ago' },
  { id: '3', title: 'Funding Norm Decay Accrued (0.985 factor)', block: 'Block #18,930,012', time: '5h ago' },
];
