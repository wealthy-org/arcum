import { useAccount, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { parseAbiItem } from 'viem';
import { C } from '../../config/contracts';
import { WRITER_POOL_ABI } from '../../contracts/abis';

const CLAIM_WINDOW = 7 * 24 * 3600;

export type WithdrawTicket = {
  id: bigint;
  owner: `0x${string}`;
  shares: bigint;
  claimableAt: number;
  status: 'waiting' | 'claimable' | 'expired' | 'done';
};

export function useWithdrawTickets() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: 46630 });

  return useQuery({
    queryKey: ['tickets', address],
    enabled: !!address && !!client,
    refetchInterval: 15_000,
    queryFn: async (): Promise<WithdrawTicket[]> => {
      if (!client || !address) return [];
      try {
        const currentBlock = await client.getBlockNumber();
        // Public RPCs limit eth_getLogs block range (e.g. 10,000 to 50,000 blocks).
        // Clamp fromBlock to at most 45,000 blocks back if deployBlock is too far.
        const maxRange = 45000n;
        const deploy = C.deployBlock > 0n ? C.deployBlock : 0n;
        const from = currentBlock > maxRange && (currentBlock - deploy > maxRange) ? currentBlock - maxRange : deploy;

        const queued = await client.getLogs({
          address: C.writerPool,
          event: parseAbiItem(
            'event WithdrawalQueued(address indexed owner, uint256 indexed ticket, uint256 shares, uint64 claimableAt)'
          ),
          args: { owner: address },
          fromBlock: from,
          toBlock: currentBlock,
        });

        const ticketIds = [...new Set(queued.map((l) => l.args.ticket!))].filter(Boolean);
        const now = Math.floor(Date.now() / 1000);

        const tickets = await Promise.all(
          ticketIds.map(async (id) => {
            const [owner, shares, claimableAt] = await client.readContract({
              address: C.writerPool,
              abi: WRITER_POOL_ABI,
              functionName: 'ticketOf',
              args: [id],
            });
            const at = Number(claimableAt);
            const status: WithdrawTicket['status'] =
              shares === 0n
                ? 'done'
                : now < at
                ? 'waiting'
                : now > at + CLAIM_WINDOW
                ? 'expired'
                : 'claimable';

            return {
              id,
              owner: owner as `0x${string}`,
              shares,
              claimableAt: at,
              status,
            };
          })
        );

        return tickets.filter((t) => t.status !== 'done');
      } catch (err) {
        console.warn('[useWithdrawTickets] getLogs/ticketOf error:', err);
        return [];
      }
    },
  });
}
