import { StockInfo, WriterPoolStats, AgentPolicy } from '../types';

export const CHAIN_CONFIG = {
  chainId: 4663,
  chainName: 'Robinhood Chain Mainnet',
  rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
  blockExplorer: 'https://robinhoodchain.blockscout.com',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  // Production deploy 2026-11-21, source: deployments/4663-production.json
  usdgAddress: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
  usdgNote: 'USDG — real production settlement token',
  isStaging: false,
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
  // Production deploy 2026-11-21, source: deployments/4663-production.json
  engine: '0x7b6D4Dd487DAdCE5f59631055E4f8B8c472B5A7D',
  writerPoolProxy: '0x19fD1A8b7C669d5CBaFFc077B50B144DBAB11D6e',
  writerPoolImpl: '0xfc6Bc2ab809835Ae08d3238497A4e82F08CB4E7A',
  volOracle: '0x3aB5Adf52ae9FEb20700868Eb6D5ee077F7D1Ed5',
  seriesRegistry: '0x3D525dbB8e7973E46023c9Ad05E6803B82AC408C',
  priceGuard: '0x13eEC2572612eA55b6cA55726FAF64a9536b210D',
  reserve: '0x60Bd8FDAf25c19d460eaCFf4FBA609bE81Fd39f5',
  feeRouter: '0x26EEC4165FEaF725278d543D0920959838aE8dB6',
  agentRouter: '0xA4334679943b7A29B55717F3a74432B0B3959B26',
  usdg: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
  owner: '0xf2EFC16D920175C8805fCF21DcD0c420691b60db', // Safe 2-of-2
  twapReference: '0x0000000000000000000000000000000000000000',
  timelock: '0x0000000000000000000000000000000000000000',
  isDeployed: true,
  isStaging: false,
};

export const TESTNET_CONTRACT_ADDRESSES = {
  engine: '0x98F7B4Ae9615a655c4321b1326D588e35303280C',
  writerPoolProxy: '0x1F79F6D8eFB739c270Ec7957Fff0754151eF550F',
  writerPoolImpl: '0xb3EB4f6E3A0720DE6dD26B168d882813aF772446',
  agentRouter: '0xAB3379ca486c7365C693FB6263B021759F45ffaa',
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
    ivDailyBps: 5200,
    ivWeeklyBps: 4800,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    address: '0xd74c859B57AeE119E7Fd121309b4ca8c2De997d6',
    ivDailyBps: 6400,
    ivWeeklyBps: 5900,
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    address: '0xb7d5D5Cc9fECf68Ad449F5167e80C34D06cFAc1d',
    ivDailyBps: 1800,
    ivWeeklyBps: 1650,
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    address: '0xd5F42ad1Ace31Ac95F31DAdeEd727C5c8A21f110',
    ivDailyBps: 2400,
    ivWeeklyBps: 2200,
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    address: '0xb5c3A000832ab1D13A8a6a33ba49696163d49379',
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
  agentAddress: '',
  budgetUsdg: 0.0,
  spentUsdg: 0.0,
  maxPerTradeUsdg: 0.0,
  expiresAt: 0,
  canSell: false,
  canShield: false,
  allowedStocks: [],
  revoked: false,
};
