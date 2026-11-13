import { useReadContract } from 'wagmi';
import { AGENT_ROUTER_ABI } from '../../contracts/abis';
import { ARCUM_TESTNET_CONTRACTS } from '../../config/wagmi';

export function useOnChainAgentPolicy(ownerAddress?: `0x${string}`, agentAddress?: `0x${string}`) {
  return useReadContract({
    address: ARCUM_TESTNET_CONTRACTS.agentRouter,
    abi: AGENT_ROUTER_ABI,
    functionName: 'policyOf',
    args: ownerAddress && agentAddress ? [ownerAddress, agentAddress] : undefined,
    query: {
      enabled: !!ownerAddress && !!agentAddress,
      refetchInterval: 15_000,
    },
  });
}
