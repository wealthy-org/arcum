import { useAccount, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { parseAbiItem, formatUnits } from 'viem';
import { C } from '../../config/contracts';

const EV = {
  bought: parseAbiItem(
    'event Bought(bytes32 indexed id, address indexed account, address recipient, uint256 units, uint256 tokens, uint256 usdgPaid, uint256 vMarkWad, uint64 sigmaBps, uint8 session)'
  ),
  sold: parseAbiItem(
    'event Sold(bytes32 indexed id, address indexed account, address recipient, uint256 units, uint256 tokens, uint256 usdgReceived, uint256 vMarkWad, uint64 sigmaBps, uint8 session)'
  ),
  shield: parseAbiItem(
    'event ShieldBought(address indexed account, address indexed stock, bytes32 indexed id, uint256 tokenUnits, uint256 usdgPaid)'
  ),
  queued: parseAbiItem(
    'event WithdrawalQueued(address indexed owner, uint256 indexed ticket, uint256 shares, uint64 claimableAt)'
  ),
  claimed: parseAbiItem(
    'event WithdrawalClaimed(address indexed owner, uint256 indexed ticket, uint256 usdg)'
  ),
  revoked: parseAbiItem('event PolicyRevoked(address indexed owner, address indexed agent)'),
  deposit: parseAbiItem(
    'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)'
  ),
};

export type ActivityItem = {
  kind: 'Buy' | 'Sell' | 'Shield' | 'Withdraw request' | 'Claim' | 'Agent revoked' | 'Pool deposit';
  usdg: number | null;
  block: bigint;
  tx: `0x${string}`;
  timestamp?: number;
};

export function useActivity() {
  const { address: me } = useAccount();
  const client = usePublicClient({ chainId: 46630 });

  return useQuery({
    queryKey: ['activity', me],
    enabled: !!me && !!client,
    refetchInterval: 15_000,
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!client || !me) return [];

      try {
        const currentBlock = await client.getBlockNumber();
        const maxRange = 45000n;
        const deploy = C.deployBlock > 0n ? C.deployBlock : 0n;
        const from = currentBlock > maxRange && (currentBlock - deploy > maxRange) ? currentBlock - maxRange : deploy;

        const [b, s, sh, q, c, r, dep] = await Promise.all([
          client
            .getLogs({
              address: C.engine,
              event: EV.bought,
              args: { account: me },
              fromBlock: from,
              toBlock: currentBlock,
            })
            .catch(() => []),
          client
            .getLogs({
              address: C.engine,
              event: EV.sold,
              args: { account: me },
              fromBlock: from,
              toBlock: currentBlock,
            })
            .catch(() => []),
          client
            .getLogs({
              address: C.engine,
              event: EV.shield,
              args: { account: me },
              fromBlock: from,
              toBlock: currentBlock,
            })
            .catch(() => []),
          client
            .getLogs({
              address: C.writerPool,
              event: EV.queued,
              args: { owner: me },
              fromBlock: from,
              toBlock: currentBlock,
            })
            .catch(() => []),
          client
            .getLogs({
              address: C.writerPool,
              event: EV.claimed,
              args: { owner: me },
              fromBlock: from,
              toBlock: currentBlock,
            })
            .catch(() => []),
          client
            .getLogs({
              address: C.agentRouter,
              event: EV.revoked,
              args: { owner: me },
              fromBlock: from,
              toBlock: currentBlock,
            })
            .catch(() => []),
          client
            .getLogs({
              address: C.writerPool,
              event: EV.deposit,
              args: { owner: me },
              fromBlock: from,
              toBlock: currentBlock,
            })
            .catch(() => []),
        ]);

        const rows: { kind: ActivityItem['kind']; usdg: number | null; l: any }[] = [
          ...b.map((l) => ({
            kind: 'Buy' as const,
            usdg: -Number(formatUnits(l.args.usdgPaid ?? 0n, 6)),
            l,
          })),
          ...s.map((l) => ({
            kind: 'Sell' as const,
            usdg: Number(formatUnits(l.args.usdgReceived ?? 0n, 6)),
            l,
          })),
          ...sh.map((l) => ({
            kind: 'Shield' as const,
            usdg: -Number(formatUnits(l.args.usdgPaid ?? 0n, 6)),
            l,
          })),
          ...q.map((l) => ({
            kind: 'Withdraw request' as const,
            usdg: null,
            l,
          })),
          ...c.map((l) => ({
            kind: 'Claim' as const,
            usdg: Number(formatUnits(l.args.usdg ?? 0n, 6)),
            l,
          })),
          ...r.map((l) => ({
            kind: 'Agent revoked' as const,
            usdg: null,
            l,
          })),
          ...dep.map((l) => ({
            kind: 'Pool deposit' as const,
            usdg: Number(formatUnits(l.args.assets ?? 0n, 6)),
            l,
          })),
        ];

        return rows
          .sort((x, y) => Number(y.l.blockNumber - x.l.blockNumber))
          .map((x) => ({
            kind: x.kind,
            usdg: x.usdg,
            block: x.l.blockNumber,
            tx: x.l.transactionHash as `0x${string}`,
          }));
      } catch (err) {
        console.warn('[useActivity] Error fetching logs:', err);
        return [];
      }
    },
  });
}
