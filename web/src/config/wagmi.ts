import { defineChain } from 'viem';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

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
  usdg: '0x0953ac821a5f07A39b02Ecf5faaEca0477f13986' as const,
  engine: '0x98F7B4Ae9615a655c4321b1326D588e35303280C' as const,
  writerPool: '0x1F79F6D8eFB739c270Ec7957Fff0754151eF550F' as const,
  agentRouter: '0x136c20bc7c362cA1DD623035c351E1786697D846' as const,
  twapReference: '0x6670cA5cCC91820ab9c12228637D7186e6af5CCC' as const,
  reserve: '0x607cdaff55Aa86B03C3EC9075828fdbbEC879B2d' as const,
  feeRouter: '0x3cd28517B56dCF6dBf7c405eF24184b1CF41f968' as const,
  seriesRegistry: '0x9c0B29e8faD8854DdFD6Ff1bB823E75788dEa82B' as const,
  priceGuard: '0x3D541ad6c67b2B4CAFa1ecBC5E3aC877022c3dBe' as const,
  timelock: '0x0000000000000000000000000000000000000000' as const,
};

export function getContractsForChain(chainId?: number) {
  if (chainId === 46630) {
    return ARCUM_TESTNET_CONTRACTS;
  }
  return ARCUM_CONTRACTS;
}

export const wagmiConfig = getDefaultConfig({
  appName: 'Arcum Everlasting Options',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'c4f79cc821944d9680842e34466bfbd',
  chains: [robinhoodTestnet, robinhoodChain],
  ssr: false,
});

export function getExplorerTxUrl(txHash: string, chainId: number = 4663): string {
  if (chainId === 46630) {
    return `https://explorer.testnet.chain.robinhood.com/tx/${txHash}`;
  }
  return `https://robinhoodchain.blockscout.com/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string, chainId: number = 4663): string {
  if (chainId === 46630) {
    return `https://explorer.testnet.chain.robinhood.com/address/${address}`;
  }
  return `https://robinhoodchain.blockscout.com/address/${address}`;
}

