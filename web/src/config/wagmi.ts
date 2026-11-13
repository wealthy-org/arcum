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
  usdg: '0x2d97243c649E0CCBAe64155391472c323856BF13' as const,
  engine: '0xB235F41d44F301520B34a276D196BBd3ab6457A2' as const,
  writerPool: '0x4c7882288286309E62312EA9a6e9F6100E14B241' as const,
  agentRouter: '0x128964a29e0e2C8D16eCbc5D65164df74d9168e4' as const,
  twapReference: '0x06130bb275AeA45133830fB1AdD518c2c4caD72f' as const,
  reserve: '0x6a438799f499354976B633f79eaFbd030444a824' as const,
  feeRouter: '0xab169002108AE3912a54582C1869990bdAB0c708' as const,
  seriesRegistry: '0x359105D4b3dF23BfDEC8E12c97b4cFeA9a830Fc7' as const,
  priceGuard: '0x152Cf15955D1ECC59Fd820565c25990e1367936F' as const,
  timelock: '0x68c276f4a75602fcf722b0119dc774466884a94e' as const,
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

