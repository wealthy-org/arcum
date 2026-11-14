import { useWriteContract, usePublicClient } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { BaseError, ContractFunctionRevertedError } from 'viem';

const EXPLORER = 'https://explorer.testnet.chain.robinhood.com/tx/';

export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: 46630 });
  const qc = useQueryClient();

  async function send(
    req: Parameters<typeof writeContractAsync>[0],
    label: string,
    toast: (t: string, m: string, k: 'info' | 'success' | 'error') => void
  ) {
    if (!client) {
      toast(label, 'Robinhood Testnet client not ready. Verify your network connection.', 'error');
      throw new Error('Public client not connected');
    }

    try {
      // 1) Simulasi dulu: error kontrak ketahuan sebelum user bayar gas
      if (client) {
        try {
          await client.simulateContract({ ...(req as any), account: (req as any).account });
        } catch (simErr) {
          console.warn('[useTx] Simulation warning:', simErr);
          // Don't completely block if simulation fails due to missing account, but if it's a revert error, decode it
          if (simErr instanceof BaseError) {
            const revert = simErr.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
            if (revert?.data?.errorName) {
              const msg = `${revert.data.errorName}${revert.data.args ? ' ' + revert.data.args.join(', ') : ''}`;
              toast(label, `Simulation failed: ${msg}`, 'error');
              throw simErr;
            }
          }
        }
      }

      toast(label, 'Confirm in your wallet…', 'info');
      const hash = await writeContractAsync(req);
      toast(label, 'Waiting for confirmation on-chain…', 'info');
      
      const receipt = await client!.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error(`Transaction reverted: ${EXPLORER}${hash}`);
      }
      
      await qc.invalidateQueries(); // Semua hook baca chain otomatis refetch
      toast(label, `Confirmed on testnet! Tx: ${hash.slice(0, 10)}…${hash.slice(-8)}`, 'success');
      return receipt;
    } catch (e: any) {
      toast(label, decodeError(e), 'error');
      throw e;
    }
  }

  return { send };
}

export function decodeError(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    if (revert?.data?.errorName) {
      return `${revert.data.errorName}${revert.data.args ? ' ' + revert.data.args.join(', ') : ''}`;
    }
    if (e.shortMessage?.includes('User rejected')) {
      return 'Rejected in wallet. No funds moved.';
    }
    return e.shortMessage || e.message;
  }
  return String(e);
}
