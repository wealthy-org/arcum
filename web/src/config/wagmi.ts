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

// Deployed 2026-11-21 13:08 UTC — PRODUCTION. Real USDG, real Chainlink feeds,
// owner = Safe 2-of-2 (0xf2EFC16D920175C8805fCF21DcD0c420691b60db).
// Source: deployments/4663-production.json
export const ARCUM_CONTRACTS = {
  chainId: 4663,
  usdg: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as const, // Real USDG
  engine: '0x7b6D4Dd487DAdCE5f59631055E4f8B8c472B5A7D' as const,
  writerPool: '0x19fD1A8b7C669d5CBaFFc077B50B144DBAB11D6e' as const, // proxy
  agentRouter: '0xA4334679943b7A29B55717F3a74432B0B3959B26' as const,
  twapReference: '0x0000000000000000000000000000000000000000' as const,
  reserve: '0x60Bd8FDAf25c19d460eaCFf4FBA609bE81Fd39f5' as const,
  feeRouter: '0x26EEC4165FEaF725278d543D0920959838aE8dB6' as const,
  seriesRegistry: '0x3D525dbB8e7973E46023c9Ad05E6803B82AC408C' as const,
  priceGuard: '0x13eEC2572612eA55b6cA55726FAF64a9536b210D' as const,
  volOracle: '0x3aB5Adf52ae9FEb20700868Eb6D5ee077F7D1Ed5' as const,
  owner: '0xf2EFC16D920175C8805fCF21DcD0c420691b60db' as const, // Safe 2-of-2
  isLive: true,
  isStaging: false,
  deployBlock: 0n,
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
  deployBlock: 0n,
};

export function getContractsForChain(_chainId?: number) {
  // Mainnet (4663) = production (real USDG, real Chainlink feeds, Safe owner).
  // Testnet (46630) = default for development. Zero/unknown ids fall back to testnet.
  if (_chainId === 4663) return ARCUM_CONTRACTS;
  return ARCUM_TESTNET_CONTRACTS;
}

export const wagmiConfig = getDefaultConfig({
  appName: 'Arcum Everlasting Options',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'c4f79cc821944d9680842e34466bfbd',
  // Mainnet (4663) production & Testnet (46630) enabled
  chains: [robinhoodChain, robinhoodTestnet],
  ssr: false,
});

export function getExplorerTxUrl(txHash: string, chainId: number = 46630): string {
  if (chainId === 4663) return `https://robinhoodchain.blockscout.com/tx/${txHash}`;
  return `https://explorer.testnet.chain.robinhood.com/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string, chainId: number = 46630): string {
  if (chainId === 4663) return `https://robinhoodchain.blockscout.com/address/${address}`;
  return `https://explorer.testnet.chain.robinhood.com/address/${address}`;
}

