import { useReadContract } from 'wagmi';
import { ARCUM_ENGINE_ABI } from '../../contracts/abis';
import { ARCUM_TESTNET_CONTRACTS } from '../../config/wagmi';

export function useOnChainQuote(seriesId?: `0x${string}`, unitsWad?: bigint, isBuy: boolean = true) {
  return useReadContract({
    address: ARCUM_TESTNET_CONTRACTS.engine,
    abi: ARCUM_ENGINE_ABI,
    functionName: 'quote',
    args: seriesId && unitsWad ? [seriesId, unitsWad, isBuy] : undefined,
    query: {
      enabled: !!seriesId && !!unitsWad && unitsWad > 0n,
      refetchInterval: 12_000,
    },
  });
}
