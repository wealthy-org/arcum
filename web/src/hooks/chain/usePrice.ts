import { useReadContract, useChainId } from 'wagmi';
import { PRICE_GUARD_ABI } from '../../contracts/abis';
import { getContractsForChain } from '../../config/wagmi';

export function usePrice(stockAddress?: `0x${string}`) {
  const chainId = useChainId();
  return useReadContract({
    address: getContractsForChain(chainId || 46630).priceGuard,
    abi: PRICE_GUARD_ABI,
    functionName: 'readLite',
    args: stockAddress ? [stockAddress] : undefined,
    query: {
      enabled: !!stockAddress,
      refetchInterval: 10_000,
    },
  });
}
