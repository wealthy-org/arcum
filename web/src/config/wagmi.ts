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

// Deployed 2026-11-17 14:22 UTC (tx 32/32 OK). STAGING/DEMO config: settlement =
// MockUSDG (mintable), prices are hardcoded mocks in PriceGuard. NOT production.
// Source: deployments/4663.json (written from broadcast per tombstone rule).
export const ARCUM_CONTRACTS = {
  chainId: 4663,
  usdg: '0x2d97243c649e0ccbae64155391472c323856bf13' as const, // MockUSDG
  engine: '0x85dfeb76c3e6c56cb88aaaae99cbc2d597defae8' as const,
  writerPool: '0x5513247a9ee83c2e516ea4c03273d12eb71e9469' as const, // proxy
  agentRouter: '0xd7a2a6c661d7a3d327255b895ce450eca4fb0e95' as const,
  twapReference: '0x0000000000000000000000000000000000000000' as const,
  reserve: '0x099dc732855d340c503f9144464ba00901aed8ff' as const,
  feeRouter: '0x4c7882288286309e62312ea9a6e9f6100e14b241' as const,
  seriesRegistry: '0xa38a54108e9a01625974968c34e555b727b0c378' as const,
  priceGuard: '0x2d6c6e428f34c941a539c90c9f2574cfe3c44867' as const,
  timelock: '0x0000000000000000000000000000000000000000' as const, // EOA owner
  isLive: true,
  isStaging: true,
  stagingNote: 'STAGING/DEMO: MockUSDG + mock prices. Bukan konfigurasi produksi.',
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
  // Testnet (46630) remains the default environment; mainnet (4663) is staging-live
  // with honest demo config (MockUSDG + mock prices). Zero/unknown ids fall back to testnet.
  if (_chainId === 4663) return ARCUM_CONTRACTS;
  return ARCUM_TESTNET_CONTRACTS;
}

export const wagmiConfig = getDefaultConfig({
  appName: 'Arcum Everlasting Options',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'c4f79cc821944d9680842e34466bfbd',
  // Testnet first = default. Mainnet (4663) enabled for staging-live contracts
  // (MockUSDG + mock prices — honest staging, not production).
  chains: [robinhoodTestnet, robinhoodChain],
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

