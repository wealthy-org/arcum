import { useReadContract } from 'wagmi';
import { AGENT_ROUTER_ABI } from '../../contracts/abis';
import { C } from '../../config/contracts';

export function useOnChainAgentPolicy(ownerAddress?: `0x${string}`, agentAddress?: `0x${string}`) {
  return useReadContract({
    address: C.agentRouter,
    abi: AGENT_ROUTER_ABI,
    functionName: 'policyOf',
    args: ownerAddress && agentAddress ? [ownerAddress, agentAddress] : undefined,
    query: {
      enabled: !!ownerAddress && !!agentAddress,
      refetchInterval: 15_000,
    },
  });
}
