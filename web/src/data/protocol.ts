import { StockInfo, WriterPoolStats, AgentPolicy } from '../types';

export const CHAIN_CONFIG = {
  chainId: 4663,
  chainName: 'Robinhood Chain Mainnet',
  rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
  blockExplorer: 'https://robinhoodchain.blockscout.com',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  usdgAddress: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
};

export const TESTNET_CHAIN_CONFIG = {
  chainId: 46630,
  chainName: 'Robinhood Chain Testnet',
  rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
  blockExplorer: 'https://explorer.testnet.chain.robinhood.com',
  nativeCurrency: { name: 'Ether', symbol: 'tETH', decimals: 18 },
  usdgAddress: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
};

export const CONTRACT_ADDRESSES = {
  engineProxy: '0x1C1f41721fe49c8dee117B17De1006817C974687',
  writerPoolProxy: '0x67fF1306201bCbEBCBB749DcF0cb2686ec11B58A',
  agentRouter: '0x0Dd88438A7d5Aa39141240BC846482cB3a74D0c9',
  twapReference: '0x33d88438A7d5Aa39141240BC846482cB3a74D0c9',
  reserve: '0x2f719703bf5d569975c5cf32748b64d1926762b7',
  feeRouter: '0x01dcf620ebd6b4db8cba7834bd0f2245855eea6e',
  timelock: '0x58c276f4a75602fcf722b0119dc774466884a94e',
};

export const TESTNET_CONTRACT_ADDRESSES = {
  engineProxy: '0x2A1f41721fe49c8dee117B17De1006817C974687',
  writerPoolProxy: '0x77fF1306201bCbEBCBB749DcF0cb2686ec11B58A',
  agentRouter: '0x1Dd88438A7d5Aa39141240BC846482cB3a74D0c9',
  twapReference: '0x33d88438A7d5Aa39141240BC846482cB3a74D0c9',
  reserve: '0x3f719703bf5d569975c5cf32748b64d1926762b7',
  feeRouter: '0x11dcf620ebd6b4db8cba7834bd0f2245855eea6e',
  timelock: '0x68c276f4a75602fcf722b0119dc774466884a94e',
};

export const INITIAL_STOCKS: StockInfo[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    address: '0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec',
    price: 142.50,
    change24h: 3.42,
    ivDailyBps: 5200,
    ivWeeklyBps: 4800,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    address: '0x322f0929c4625ed5bad873c95208d54e1c003b2d',
    price: 248.80,
    change24h: -1.15,
    ivDailyBps: 6400,
    ivWeeklyBps: 5900,
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    address: '0x117cc2133c37b721f49de2a7a74833232b3b4c0c',
    price: 585.20,
    change24h: 0.65,
    ivDailyBps: 1800,
    ivWeeklyBps: 1650,
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    address: '0xd5f3879160bc7c32ebb4dc785f8a4f505888de68',
    price: 498.40,
    change24h: 1.12,
    ivDailyBps: 2400,
    ivWeeklyBps: 2200,
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    address: '0xaf3d76f1834a1d425780943c99ea8a608f8a93f9',
    price: 226.75,
    change24h: 0.45,
    ivDailyBps: 2800,
    ivWeeklyBps: 2600,
  }
];

export const INITIAL_POOL_STATS: WriterPoolStats = {
  navUsdg: 2500000.0,
  conservativeEntryNav: 2497500.0,
  totalShares: 2450000.0,
  navPerShare: 1.0204,
  openLiabilityUsdg: 435000.0,
  maxLiabilityCapacityUsdg: 875000.0, // 35% of NAV
  capacityUtilizationPct: 49.7,
  usdgCash: 1850000.0,
  spotHedgesUsdg: 580000.0,
  reserveUsdg: 125000.0,
  depositLockHours: 24,
  withdrawalNoticeHours: 72,
  claimWindowDays: 7,
  aprPct: 18.4,
};

export const INITIAL_AGENT_POLICY: AgentPolicy = {
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
