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
  usdgAddress: '0x0953ac821a5f07A39b02Ecf5faaEca0477f13986',
};

export const CONTRACT_ADDRESSES = {
  engineProxy: '0x0000000000000000000000000000000000000000',
  writerPoolProxy: '0x0000000000000000000000000000000000000000',
  agentRouter: '0x0000000000000000000000000000000000000000',
  twapReference: '0x0000000000000000000000000000000000000000',
  reserve: '0x0000000000000000000000000000000000000000',
  feeRouter: '0x0000000000000000000000000000000000000000',
  timelock: '0x0000000000000000000000000000000000000000',
  isDeployed: false,
};

export const TESTNET_CONTRACT_ADDRESSES = {
  engineProxy: '0x98F7B4Ae9615a655c4321b1326D588e35303280C',
  writerPoolProxy: '0x1F79F6D8eFB739c270Ec7957Fff0754151eF550F',
  writerPoolImpl: '0xb3EB4f6E3A0720DE6dD26B168d882813aF772446',
  agentRouter: '0x136c20bc7c362cA1DD623035c351E1786697D846',
  twapReference: '0x6670cA5cCC91820ab9c12228637D7186e6af5CCC',
  reserve: '0x607cdaff55Aa86B03C3EC9075828fdbbEC879B2d',
  feeRouter: '0x3cd28517B56dCF6dBf7c405eF24184b1CF41f968',
  seriesRegistry: '0x9c0B29e8faD8854DdFD6Ff1bB823E75788dEa82B',
  priceGuard: '0x3D541ad6c67b2B4CAFa1ecBC5E3aC877022c3dBe',
  timelock: '0x0000000000000000000000000000000000000000',
  usdg: '0x0953ac821a5f07A39b02Ecf5faaEca0477f13986',
  nvda: '0x98a7b951482601E825dC5609A2224e0677f9101D',
  tsla: '0xd74c859B57AeE119E7Fd121309b4ca8c2De997d6',
  spy: '0xb7d5D5Cc9fECf68Ad449F5167e80C34D06cFAc1d',
  qqq: '0xd5F42ad1Ace31Ac95F31DAdeEd727C5c8A21f110',
  aapl: '0xb5c3A000832ab1D13A8a6a33ba49696163d49379',
};

export const INITIAL_STOCKS: StockInfo[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    address: '0x98a7b951482601E825dC5609A2224e0677f9101D',
    price: 142.50,
    change24h: 3.42,
    ivDailyBps: 5200,
    ivWeeklyBps: 4800,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    address: '0xd74c859B57AeE119E7Fd121309b4ca8c2De997d6',
    price: 248.80,
    change24h: -1.15,
    ivDailyBps: 6400,
    ivWeeklyBps: 5900,
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    address: '0xb7d5D5Cc9fECf68Ad449F5167e80C34D06cFAc1d',
    price: 585.20,
    change24h: 0.65,
    ivDailyBps: 1800,
    ivWeeklyBps: 1650,
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    address: '0xd5F42ad1Ace31Ac95F31DAdeEd727C5c8A21f110',
    price: 498.40,
    change24h: 1.12,
    ivDailyBps: 2400,
    ivWeeklyBps: 2200,
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    address: '0xb5c3A000832ab1D13A8a6a33ba49696163d49379',
    price: 226.75,
    change24h: 0.45,
    ivDailyBps: 2800,
    ivWeeklyBps: 2600,
  }
];

export const INITIAL_POOL_STATS: WriterPoolStats = {
  navUsdg: 5000000.0,
  conservativeEntryNav: 4995000.0,
  totalShares: 4995004.99,
  navPerShare: 1.001,
  openLiabilityUsdg: 0.0,
  maxLiabilityCapacityUsdg: 35000000.0,
  capacityUtilizationPct: 0.0,
  usdgCash: 5000000.0,
  spotHedgesUsdg: 0.0,
  reserveUsdg: 0.0,
  depositLockHours: 0.083,
  withdrawalNoticeHours: 0.5,
  claimWindowDays: 7,
  aprPct: 0.0,
};

export const INITIAL_AGENT_POLICY: AgentPolicy = {
  agentAddress: '0x136c20bc7c362cA1DD623035c351E1786697D846',
  budgetUsdg: 0.0,
  spentUsdg: 0.0,
  maxPerTradeUsdg: 0.0,
  expiresAt: 0,
  canSell: false,
  canShield: false,
  allowedStocks: [],
  revoked: false,
};
