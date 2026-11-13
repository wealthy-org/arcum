import { useReadContract } from 'wagmi';
import { PRICE_GUARD_ABI } from '../../contracts/abis';
import { ARCUM_TESTNET_CONTRACTS } from '../../config/wagmi';

export function usePrice(stockAddress?: `0x${string}`) {
  return useReadContract({
    address: ARCUM_TESTNET_CONTRACTS.priceGuard,
    abi: PRICE_GUARD_ABI,
    functionName: 'readLite',
    args: stockAddress ? [stockAddress] : undefined,
    query: {
      enabled: !!stockAddress,
      refetchInterval: 10_000,
    },
  });
}
