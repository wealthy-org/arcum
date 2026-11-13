import { useReadContract } from 'wagmi';
import { SERIES_REGISTRY_ABI } from '../../contracts/abis';
import { ARCUM_TESTNET_CONTRACTS } from '../../config/wagmi';

export function useSeriesCount() {
  return useReadContract({
    address: ARCUM_TESTNET_CONTRACTS.seriesRegistry,
    abi: SERIES_REGISTRY_ABI,
    functionName: 'seriesCount',
    query: {
      refetchInterval: 30_000,
    },
  });
}

export function useSeriesOf(seriesId?: `0x${string}`) {
  return useReadContract({
    address: ARCUM_TESTNET_CONTRACTS.seriesRegistry,
    abi: SERIES_REGISTRY_ABI,
    functionName: 'seriesOf',
    args: seriesId ? [seriesId] : undefined,
    query: {
      enabled: !!seriesId,
      refetchInterval: 30_000,
    },
  });
}
