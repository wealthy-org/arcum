import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { ERC20_ABI } from '../../contracts/abis';
import { UserPosition, StockSymbol } from '../../types';
import { quoteOption } from '../../utils/pricing';

export const TESTNET_OPTION_TOKENS = [
  {
    id: '0x9e5770416c7ca8f49574c581cefa54347e874d0cad92e5f46d5eb5b69c1ccc5d' as const,
    token: '0x3B569c58a2e54E2afAc9874b5fB23805e89474ac' as const,
    stock: 'NVDA' as StockSymbol,
    isCall: true,
    speed: 'DAILY' as const,
    strike: 138,
    spotPrice: 142.50,
  },
  {
    id: '0xd473e186aff4837c2b2d71829c64ee117b6f5a832bc5c5b188b28623928bc572' as const,
    token: '0x8dca2945dadD367EF523351907A02FA591EE06A8' as const,
    stock: 'NVDA' as StockSymbol,
    isCall: true,
    speed: 'DAILY' as const,
    strike: 141,
    spotPrice: 142.50,
  },
  {
    id: '0x5e4da9586db67c4e514f8c33e8a3f9a80aae2ebaab41ffa21129c2ae4f9de252' as const,
    token: '0x204A7EB2DA7E2A774e2efD1266d363A989cB1b25' as const,
    stock: 'NVDA' as StockSymbol,
    isCall: true,
    speed: 'DAILY' as const,
    strike: 144,
    spotPrice: 142.50,
  },
  {
    id: '0xe75a27a81f31a5b4216f473f55e75deecb79fbeef8cf1b2f34801ae2bc976bc7' as const,
    token: '0x7688177d4B4b09cbfe08eF1F9AdF0e134FC654d1' as const,
    stock: 'NVDA' as StockSymbol,
    isCall: true,
    speed: 'DAILY' as const,
    strike: 147,
    spotPrice: 142.50,
  },
  {
    id: '0x92c5aa0b9d5652f19abda42090d9655227e51771c4603e099a06d1c0fa5f0894' as const,
    token: '0xC9a37381bd06B16e4176f6f995B19acfb23282b3' as const,
    stock: 'NVDA' as StockSymbol,
    isCall: true,
    speed: 'DAILY' as const,
    strike: 150,
    spotPrice: 142.50,
  },
  {
    id: '0x4ccbd4f15a776ee284580b823bfbd6b64de68dd6b06859ebed4ccd7612a48a61' as const,
    token: '0x676e47acea38a23a4e47882715B48E8e5d19f5Cb' as const,
    stock: 'NVDA' as StockSymbol,
    isCall: false,
    speed: 'WEEKLY' as const,
    strike: 140,
    spotPrice: 142.50,
  },
  {
    id: '0x75555b5f68d6c411bae06e39e091e8ec93928d230f977cd89fe66cea014e4b7e' as const,
    token: '0x0E501D324B85FaD9e1f7F5dD244E266a4A29E155' as const,
    stock: 'TSLA' as StockSymbol,
    isCall: true,
    speed: 'DAILY' as const,
    strike: 240,
    spotPrice: 248.80,
  },
  {
    id: '0x75f18a757d9fdde48d01c304adc67d4d17e777b6450b3258104b428aa24308c8' as const,
    token: '0x36d0aa86ABdbbf216759d31Cfb1800Df8852dA06' as const,
    stock: 'TSLA' as StockSymbol,
    isCall: false,
    speed: 'WEEKLY' as const,
    strike: 235,
    spotPrice: 248.80,
  },
  {
    id: '0x5623521e7be812536163ef204bad54c46e1a270b8907a4c89ca0bdedb1a660c5' as const,
    token: '0xb5Aa11301a5DD752237f3EFA4614F1D7688aA429' as const,
    stock: 'SPY' as StockSymbol,
    isCall: false,
    speed: 'WEEKLY' as const,
    strike: 570,
    spotPrice: 585.20,
  },
  {
    id: '0xa93765e1ec5c93d00524f978ee85d6846f5af4d8c3253d94c36bbde819021edb' as const,
    token: '0x953be8FD242Ff06f9a3b43a0e077f7F4ea0B6941' as const,
    stock: 'QQQ' as StockSymbol,
    isCall: false,
    speed: 'WEEKLY' as const,
    strike: 485,
    spotPrice: 498.40,
  },
  {
    id: '0x80c59123d2ee5f9fb1d4bdd7d09656f4231577f5e422ea6c747df892293d6d3d' as const,
    token: '0x37753ACf3ed21618a28dCAf1c4C9821bc41e14ed' as const,
    stock: 'AAPL' as StockSymbol,
    isCall: false,
    speed: 'WEEKLY' as const,
    strike: 220,
    spotPrice: 226.75,
  },
];

export function useOnChainPositions(userAddress?: `0x${string}`) {
  const contracts = TESTNET_OPTION_TOKENS.map((t) => ({
    address: t.token,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  }));

  const { data, refetch, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: !!userAddress,
      refetchInterval: 10_000,
    },
  });

  const activePositions: UserPosition[] = [];

  if (data && userAddress) {
    data.forEach((result, idx) => {
      const balance = result?.result as bigint | undefined;
      if (balance && balance > 0n) {
        const item = TESTNET_OPTION_TOKENS[idx];
        const rawTokens = parseFloat(formatUnits(balance, 18));
        const quote = quoteOption(
          item.spotPrice,
          item.strike,
          item.speed === 'DAILY' ? 5200 : 4800,
          item.speed,
          item.isCall,
          rawTokens
        );

        activePositions.push({
          id: `onchain-${item.id}`,
          seriesId: item.id,
          stock: item.stock,
          isCall: item.isCall,
          speed: item.speed,
          strike: item.strike,
          rawTokens: rawTokens,
          norm: 1.0,
          effectiveUnits: rawTokens,
          entryPriceUsdg: quote.markPriceUsdg,
          currentValueUsdg: quote.totalCostUsdg,
          pnlUsdg: 0,
          pnlPct: 0,
          boughtAt: Date.now(),
        });
      }
    });
  }

  return { onChainPositions: activePositions, refetch, isLoading };
}
