import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { SERIES_REGISTRY_ABI } from '../../contracts/abis';
import { C } from '../../config/contracts';

export type ListedSeries = {
  id: `0x${string}`;
  stock: `0x${string}`;
  isCall: boolean;
  tauSeconds: number;
  strike: number;
  strikeWad: bigint;
  token: `0x${string}`;
  norm: bigint;
  buyable: boolean;
  archived: boolean;
};

export function useSeriesList() {
  const { data: count, ...countRest } = useReadContract({
    address: C.seriesRegistry,
    abi: SERIES_REGISTRY_ABI,
    functionName: 'seriesCount',
    query: { refetchInterval: 30_000 },
  });
  const n = Number(count ?? 0n);

  const { data: ids } = useReadContracts({
    contracts: Array.from({ length: n }, (_, i) => ({
      address: C.seriesRegistry,
      abi: SERIES_REGISTRY_ABI,
      functionName: 'seriesIdAt',
      args: [BigInt(i)],
    } as const)),
    query: { enabled: n > 0 },
  });
  const idList = (ids ?? []).map((r) => r.result).filter(Boolean) as `0x${string}`[];

  const { data: infos, ...rest } = useReadContracts({
    contracts: idList.map((id) => ({
      address: C.seriesRegistry,
      abi: SERIES_REGISTRY_ABI,
      functionName: 'seriesOf',
      args: [id],
    } as const)),
    query: { enabled: idList.length > 0, refetchInterval: 30_000 },
  });

  const series: ListedSeries[] = (infos ?? []).flatMap((r, i) => {
    const s = r.result as any;
    if (!s) return [];
    return [{
      id: idList[i],
      stock: s.stock,
      isCall: s.isCall,
      tauSeconds: Number(s.tauSeconds),
      strike: Number(formatUnits(s.strike, 18)),
      strikeWad: s.strike,
      token: s.token,
      norm: s.norm,
      buyable: s.buyable,
      archived: s.archived,
    }];
  });

  return { series, ...rest, count: n };
}

/** Strike yang bisa dibeli untuk kombinasi yang dipilih user. */
export function strikesFor(series: ListedSeries[], stock: string, isCall: boolean, tauSeconds: number) {
  return series
    .filter(
      (s) =>
        s.stock.toLowerCase() === stock.toLowerCase() &&
        s.isCall === isCall &&
        s.tauSeconds === tauSeconds &&
        s.buyable &&
        !s.archived
    )
    .sort((a, b) => a.strike - b.strike);
}

export function useSeriesCount() {
  return useReadContract({
    address: C.seriesRegistry,
    abi: SERIES_REGISTRY_ABI,
    functionName: 'seriesCount',
    query: { refetchInterval: 30_000 },
  });
}

export function useSeriesOf(seriesId?: `0x${string}`) {
  return useReadContract({
    address: C.seriesRegistry,
    abi: SERIES_REGISTRY_ABI,
    functionName: 'seriesOf',
    args: seriesId ? [seriesId] : undefined,
    query: {
      enabled: !!seriesId,
      refetchInterval: 30_000,
    },
  });
}
