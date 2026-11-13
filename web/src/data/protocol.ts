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
  usdgAddress: '0x2d97243c649E0CCBAe64155391472c323856BF13',
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
  engineProxy: '0xB235F41d44F301520B34a276D196BBd3ab6457A2',
  writerPoolProxy: '0x4c7882288286309E62312EA9a6e9F6100E14B241',
  writerPoolImpl: '0x099DC732855d340c503f9144464bA00901AED8FF',
  agentRouter: '0x128964a29e0e2C8D16eCbc5D65164df74d9168e4',
  twapReference: '0x06130bb275AeA45133830fB1AdD518c2c4caD72f',
  reserve: '0x6a438799f499354976B633f79eaFbd030444a824',
  feeRouter: '0xab169002108AE3912a54582C1869990bdAB0c708',
  seriesRegistry: '0x359105D4b3dF23BfDEC8E12c97b4cFeA9a830Fc7',
  priceGuard: '0x152Cf15955D1ECC59Fd820565c25990e1367936F',
  timelock: '0x68c276f4a75602fcf722b0119dc774466884a94e',
};

export const INITIAL_STOCKS: StockInfo[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    address: '0x2D6C6e428F34c941A539c90C9f2574cfe3c44867',
    price: 142.50,
    change24h: 3.42,
    ivDailyBps: 5200,
    ivWeeklyBps: 4800,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    address: '0x073f20aB2AD90299f5A93d9c0b9305D60dFa9A74',
    price: 248.80,
    change24h: -1.15,
    ivDailyBps: 6400,
    ivWeeklyBps: 5900,
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    address: '0x160CE967532B16DFb24b038D8c2Ec87a5a81f405',
    price: 585.20,
    change24h: 0.65,
    ivDailyBps: 1800,
    ivWeeklyBps: 1650,
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    address: '0x4665f775e81110d9cd24307Fe0817D1f2c9Ab521',
    price: 498.40,
    change24h: 1.12,
    ivDailyBps: 2400,
    ivWeeklyBps: 2200,
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    address: '0x569Bc52aF2049E0171F5cd5Ff8927eA5dA94cFD2',
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
