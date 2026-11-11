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
      url: 'https://testnet.robinhoodchain.blockscout.com',
    },
  },
  testnet: true,
});

export const ARCUM_CONTRACTS = {
  chainId: 4663,
  usdg: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as const,
  engine: '0x1C1f41721fe49c8dee117B17De1006817C974687' as const,
  writerPool: '0x67fF1306201bCbEBCBB749DcF0cb2686ec11B58A' as const,
  agentRouter: '0x0Dd88438A7d5Aa39141240BC846482cB3a74D0c9' as const,
  reserve: '0x2f719703bf5d569975c5cf32748b64d1926762b7' as const,
  feeRouter: '0x01dcf620ebd6b4db8cba7834bd0f2245855eea6e' as const,
  timelock: '0x58c276f4a75602fcf722b0119dc774466884a94e' as const,
};

export const wagmiConfig = getDefaultConfig({
  appName: 'Arcum Everlasting Options',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'c4f79cc821944d9680842e34466bfbd',
  chains: [robinhoodChain, robinhoodTestnet],
  ssr: false,
});

export function getExplorerTxUrl(txHash: string, chainId: number = 4663): string {
  if (chainId === 46630) {
    return `https://testnet.robinhoodchain.blockscout.com/tx/${txHash}`;
  }
  return `https://robinhoodchain.blockscout.com/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string, chainId: number = 4663): string {
  if (chainId === 46630) {
    return `https://testnet.robinhoodchain.blockscout.com/address/${address}`;
  }
  return `https://robinhoodchain.blockscout.com/address/${address}`;
}

