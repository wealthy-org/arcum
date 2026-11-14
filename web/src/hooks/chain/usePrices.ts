import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { PRICE_GUARD_ABI } from '../../contracts/abis';
import { C } from '../../config/contracts';

export type PriceInfo = {
  address: `0x${string}`;
  price: number | null;
  fresh: boolean;
  buysPaused: boolean;
  session?: number;
  error: boolean;
};

export function usePrices(stocks: { address: `0x${string}` }[]) {
  const { data, isError, isLoading, refetch } = useReadContracts({
    contracts: stocks.map((s) => ({
      address: C.priceGuard,
      abi: PRICE_GUARD_ABI,
      functionName: 'readLite',
      args: [s.address],
    } as const)),
    query: { refetchInterval: 10_000 },
  });

  const prices: PriceInfo[] = stocks.map((s, i) => {
    const r = data?.[i]?.result as any;
    return {
      address: s.address,
      price: r && r.s > 0n ? Number(formatUnits(r.s, 18)) : null, // null jika 0 atau belum ada data
      fresh: r?.fresh ?? false,
      buysPaused: r?.buysPaused ?? false,
      session: r?.session as number | undefined,
      error: isError,
    };
  });

  return { prices, isLoading, isError, refetch };
}
