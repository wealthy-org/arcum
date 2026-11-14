import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import manifest from '../../../deployments/46630.json';
import { ArcumEngineAbi, SeriesRegistryAbi } from '../abi/generated';

const chain = defineChain({
  id: 46630,
  name: 'RH Testnet',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.RH_TESTNET_RPC || 'https://rpc.testnet.chain.robinhood.com'] } },
});

const privateKey = (process.env.KEEPER_PRIVATE_KEY ||
  '0x0000000000000000000000000000000000000000000000000000000000000001') as `0x${string}`;
const account = privateKeyToAccount(privateKey);
const pub = createPublicClient({ chain, transport: http() });
const wallet = createWalletClient({ chain, account, transport: http() });

const ENGINE = manifest.engineProxy as `0x${string}`;
const REG = manifest.seriesRegistry as `0x${string}`;
const MIN_ELAPSED = 3600n; // accrue kalau sudah > 1 jam
const BATCH = 20;

export async function tick() {
  try {
    const n = await pub.readContract({ address: REG, abi: SeriesRegistryAbi, functionName: 'seriesCount' });
    const now = BigInt(Math.floor(Date.now() / 1000));
    const due: `0x${string}`[] = [];

    for (let i = 0n; i < n; i++) {
      const id = await pub.readContract({ address: REG, abi: SeriesRegistryAbi, functionName: 'seriesIdAt', args: [i] });
      const s = await pub.readContract({ address: REG, abi: SeriesRegistryAbi, functionName: 'seriesOf', args: [id] });
      if (!s.archived && now - s.lastAccrual >= MIN_ELAPSED) {
        due.push(id);
      }
    }

    if (due.length === 0) {
      console.log(JSON.stringify({ at: new Date().toISOString(), action: 'accrueCheck', dueCount: 0 }));
      return;
    }

    if (!process.env.KEEPER_PRIVATE_KEY) {
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          action: 'accrueDryRun',
          dueCount: due.length,
          note: 'KEEPER_PRIVATE_KEY not set',
        })
      );
      return;
    }

    for (let i = 0; i < due.length; i += BATCH) {
      const ids = due.slice(i, i + BATCH);
      const hash = await wallet.writeContract({
        address: ENGINE,
        abi: ArcumEngineAbi,
        functionName: 'accrueMany',
        args: [ids],
      });
      const r = await pub.waitForTransactionReceipt({ hash });
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          action: 'accrueMany',
          n: ids.length,
          tx: hash,
          status: r.status,
        })
      );
    }
  } catch (e) {
    console.error(JSON.stringify({ at: new Date().toISOString(), action: 'accrueMany', error: String(e) }));
  }
}

if (process.env.RUN_KEEPER_DAEMON === 'true') {
  tick();
  setInterval(tick, 15 * 60 * 1000);
}
