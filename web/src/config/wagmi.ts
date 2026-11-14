import { defineChain } from 'viem';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { C } from './contracts';

export const robinhoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.mainnet.chain.robinhood.com'],
    },
    public: {
      http: ['https://rpc.mainnet.chain.robinhood.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Robinhood Explorer',
      url: 'https://robinhoodchain.blockscout.com',
    },
  },
});

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'tETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.chain.robinhood.com'],
    },
    public: {
      http: ['https://rpc.testnet.chain.robinhood.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Robinhood Testnet Explorer',
      url: 'https://explorer.testnet.chain.robinhood.com',
    },
  },
  testnet: true,
});

export const ARCUM_CONTRACTS = {
  chainId: 4663,
  usdg: '0x0000000000000000000000000000000000000000' as const,
  engine: '0x0000000000000000000000000000000000000000' as const,
  writerPool: '0x0000000000000000000000000000000000000000' as const,
  agentRouter: '0x0000000000000000000000000000000000000000' as const,
  reserve: '0x0000000000000000000000000000000000000000' as const,
  feeRouter: '0x0000000000000000000000000000000000000000' as const,
  timelock: '0x0000000000000000000000000000000000000000' as const,
  isLive: false,
};

export const ARCUM_TESTNET_CONTRACTS = {
  chainId: 46630,
  usdg: C.usdg,
  engine: C.engine,
  writerPool: C.writerPool,
  agentRouter: C.agentRouter,
  twapReference: '0x6670cA5cCC91820ab9c12228637D7186e6af5CCC' as const,
  reserve: '0x607cdaff55Aa86B03C3EC9075828fdbbEC879B2d' as const,
  feeRouter: '0x3cd28517B56dCF6dBf7c405eF24184b1CF41f968' as const,
  seriesRegistry: C.seriesRegistry,
  priceGuard: C.priceGuard,
  timelock: '0x0000000000000000000000000000000000000000' as const,
};

export function getContractsForChain(_chainId?: number) {
  // During testnet phase, strictly return our verified deployed testnet contracts
  return ARCUM_TESTNET_CONTRACTS;
}

export const wagmiConfig = getDefaultConfig({
  appName: 'Arcum Everlasting Options',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'c4f79cc821944d9680842e34466bfbd',
  chains: [robinhoodTestnet], // STRICTLY TESTNET ONLY! Mainnet (4663) is disabled
  ssr: false,
});

export function getExplorerTxUrl(txHash: string, _chainId: number = 46630): string {
  return `https://explorer.testnet.chain.robinhood.com/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string, _chainId: number = 46630): string {
  return `https://explorer.testnet.chain.robinhood.com/address/${address}`;
}

