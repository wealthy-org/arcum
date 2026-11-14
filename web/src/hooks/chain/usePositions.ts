import { useAccount, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { ERC20_ABI, ARCUM_ENGINE_ABI } from '../../contracts/abis';
import { C } from '../../config/contracts';
import { useSeriesList } from './useSeriesList';
import { StockSymbol, Speed } from '../../types';

const WAD = 10n ** 18n;

export type OnChainPosition = {
  id: string;
  seriesId: `0x${string}`;
  stock: StockSymbol;
  isCall: boolean;
  speed: Speed;
  tauSeconds: number;
  strike: number;
  tokenAddress: `0x${string}`;
  tokensRaw: bigint;
  tokens: number;
  rawTokens: number;
  norm: number;
  effectiveUnits: number;
  valueUsdg: number | null;
  currentValueUsdg: number;
  bidRaw?: bigint;
  dailyCostUsdg: number | null;
  vMarkWad?: bigint;
};

// Stock mapping helper
const STOCK_MAP: Record<string, StockSymbol> = {
  '0x98a7b951482601e825dc5609a2224e0677f9101d': 'NVDA',
  '0xd74c859b57aee119e7fd121309b4ca8c2de997d6': 'TSLA',
  '0xb7d5d5cc9fecf68ad449f5167e80c34d06cfac1d': 'SPY',
  '0xd5f42ad1ace31ac95f31dadeed727c5c8a21f110': 'QQQ',
  '0xb5c3a000832ab1d13a8a6a33ba49696163d49379': 'AAPL',
};

export function usePositions() {
  const { address } = useAccount();
  const { series, ...seriesRest } = useSeriesList();

  // 1) Saldo token option per series (setiap series = ERC20 sendiri, alamat di series.token)
  const { data: bals, isLoading: balsLoading, refetch: refetchBals } = useReadContracts({
    contracts: series.map((s) => ({
      address: s.token,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address!],
    } as const)),
    query: { enabled: !!address && series.length > 0, refetchInterval: 15_000 },
  });

  const held = series
    .map((s, i) => ({ s, tokens: (bals?.[i]?.result as bigint) ?? 0n }))
    .filter((x) => x.tokens > 0n);

  // 2) Effective units = tokens * norm / WAD (sama persis dengan ArcumEngine.sol:177), lalu quote bid
  const withUnits = held.map(({ s, tokens }) => ({
    s,
    tokens,
    units: (tokens * s.norm) / WAD,
  }));

  const { data: bids, isLoading: bidsLoading, refetch: refetchBids } = useReadContracts({
    contracts: withUnits.map((x) => ({
      address: C.engine,
      abi: ARCUM_ENGINE_ABI,
      functionName: 'quote',
      args: [x.s.id, x.units, false], // false = sell/bid
    } as const)),
    query: { enabled: withUnits.length > 0, refetchInterval: 15_000 },
  });

  const positions: OnChainPosition[] = withUnits.map((x, i) => {
    const q = bids?.[i]?.result as any;
    const stockSym = STOCK_MAP[x.s.stock.toLowerCase()] ?? 'NVDA';
    const speed: Speed = x.s.tauSeconds === 86400 ? 'DAILY' : 'WEEKLY';
    const tokensNum = Number(formatUnits(x.tokens, 18));
    const valueNum = q ? Number(formatUnits(q.usdg, 6)) : null;

    return {
      id: x.s.id,
      seriesId: x.s.id,
      stock: stockSym,
      isCall: x.s.isCall,
      speed,
      tauSeconds: x.s.tauSeconds,
      strike: x.s.strike,
      tokenAddress: x.s.token,
      tokensRaw: x.tokens, // Dipakai untuk sell (persis saldo token)
      tokens: tokensNum,
      rawTokens: tokensNum,
      norm: Number(formatUnits(x.s.norm, 18)),
      effectiveUnits: Number(formatUnits(x.units, 18)),
      valueUsdg: valueNum,
      currentValueUsdg: valueNum ?? 0,
      bidRaw: q?.usdg as bigint | undefined,
      dailyCostUsdg: q ? Number(formatUnits(q.dailyCostUsdg, 6)) : null,
      vMarkWad: q?.vMarkWad as bigint | undefined,
    };
  });

  return {
    positions,
    isLoading: balsLoading || bidsLoading,
    refetch: () => {
      refetchBals();
      refetchBids();
    },
  };
}
