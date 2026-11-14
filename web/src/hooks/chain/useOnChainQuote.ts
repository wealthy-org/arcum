import { useReadContract } from 'wagmi';
import { ARCUM_ENGINE_ABI } from '../../contracts/abis';
import { C } from '../../config/contracts';

export function useOnChainQuote(seriesId?: `0x${string}`, unitsWad?: bigint, isBuy: boolean = true) {
  return useReadContract({
    address: C.engine,
    abi: ARCUM_ENGINE_ABI,
    functionName: 'quote',
    args: seriesId && unitsWad ? [seriesId, unitsWad, isBuy] : undefined,
    query: {
      enabled: !!seriesId && !!unitsWad && unitsWad > 0n,
      refetchInterval: 12_000,
    },
  });
}
