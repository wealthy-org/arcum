import { useReadContracts } from 'wagmi';
import { WRITER_POOL_ABI } from '../../contracts/abis';
import { ARCUM_TESTNET_CONTRACTS } from '../../config/wagmi';

export function useOnChainPool(userAddress?: `0x${string}`) {
  const poolAddr = ARCUM_TESTNET_CONTRACTS.writerPool;

  return useReadContracts({
    contracts: [
      { address: poolAddr, abi: WRITER_POOL_ABI, functionName: 'nav' },
      { address: poolAddr, abi: WRITER_POOL_ABI, functionName: 'navPerShare' },
      { address: poolAddr, abi: WRITER_POOL_ABI, functionName: 'totalAssets' },
      { address: poolAddr, abi: WRITER_POOL_ABI, functionName: 'totalSupply' },
      ...(userAddress
        ? [
            { address: poolAddr, abi: WRITER_POOL_ABI, functionName: 'balanceOf', args: [userAddress] },
            { address: poolAddr, abi: WRITER_POOL_ABI, functionName: 'unlockTime', args: [userAddress] },
          ]
        : []),
    ],
    query: {
      refetchInterval: 12_000,
    },
  });
}
