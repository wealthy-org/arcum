import { useReadContracts, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { WRITER_POOL_ABI, ARCUM_ENGINE_ABI } from '../../contracts/abis';
import { C, SHARE_DECIMALS, WAD_DECIMALS } from '../../config/contracts';

export type OnChainPoolData = {
  navUsdg: number | null;
  navPerShare: number | null;
  totalShares: number | null;
  riskCapPct: number | null;
  lockMinutes: number | null;
  liabilityUsdg: number | null;
  myShares: bigint;
  mySharesFormatted: number | null;
  unlockAt: number | null;
  isLocked: boolean;
};

export function useOnChainPool(userAddress?: `0x${string}`) {
  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'nav' },
      { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'navPerShare' },
      { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'totalSupply' },
      { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'maxOutstandingBps' },
      { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'lockSeconds' },
      ...(userAddress
        ? [
            { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'balanceOf', args: [userAddress] },
            { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'unlockTime', args: [userAddress] },
          ]
        : []),
    ],
    query: {
      refetchInterval: 12_000,
    },
  });

  const { data: liabData } = useReadContract({
    address: C.engine,
    abi: ARCUM_ENGINE_ABI,
    functionName: 'totalLiability',
    query: {
      refetchInterval: 12_000,
    },
  });

  const [nav, nps, supply, capBps, lockSec, mySharesRaw, unlockAtRaw] = (data ?? []).map(
    (r) => r?.result
  );

  const pool: OnChainPoolData | null = data
    ? {
        navUsdg: nav != null ? Number(formatUnits(nav as bigint, WAD_DECIMALS)) : null,
        navPerShare: nps != null ? Number(formatUnits(nps as bigint, WAD_DECIMALS)) : null,
        totalShares: supply != null ? Number(formatUnits(supply as bigint, SHARE_DECIMALS)) : null,
        riskCapPct: capBps != null ? Number(capBps) / 100 : null,
        lockMinutes: lockSec != null ? Number(lockSec) / 60 : null,
        liabilityUsdg: liabData != null ? Number(formatUnits(liabData as bigint, WAD_DECIMALS)) : null,
        myShares: (mySharesRaw as bigint) ?? 0n,
        mySharesFormatted: mySharesRaw != null ? Number(formatUnits(mySharesRaw as bigint, SHARE_DECIMALS)) : null,
        unlockAt: unlockAtRaw != null ? Number(unlockAtRaw) * 1000 : null,
        isLocked: unlockAtRaw != null ? Number(unlockAtRaw) * 1000 > Date.now() : false,
      }
    : null;

  return { pool, rawData: data, isLoading, isError, refetch };
}
