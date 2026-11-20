/**
 * Arcum accrual keeper (live chain).
 *
 * Scope, per ORACLE_CHAINLINK_ARCUM.md §3: this keeper only calls `accrueMany`.
 * It never posts prices (Chainlink feeds are the price source, read direction only)
 * and never posts volatility (that is `vol-engine/post_vol.py`, a separate publisher).
 *
 * Two rules the doc is explicit about, and this file enforces:
 *   1. Only series with open interest are accrued. A series whose option token has
 *      `totalSupply() == 0` has nothing to fund, so accruing it burns gas for no state
 *      change. On 46630 that was 8 of 11 series (~73% of the gas bill).
 *   2. The tick interval comes from `KEEPER_INTERVAL_MS`, default one hour. A tighter
 *      loop does not make accrual more accurate; funding is linear in elapsed time.
 *
 * Fail closed: `KEEPER_PRIVATE_KEY` is required. Without it the module throws at load
 * instead of starting with a placeholder key that silently signs nothing.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import manifest from "../../../deployments/46630.json";
import { ArcumEngineAbi, PriceGuardAbi, SeriesRegistryAbi } from "../abi/generated";

const chain = defineChain({
  id: 46630,
  name: "RH Testnet",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.RH_TESTNET_RPC || "https://rpc.testnet.chain.robinhood.com",
      ],
    },
  },
});

const pk = process.env.KEEPER_PRIVATE_KEY;
if (!pk) {
  throw new Error(
    "KEEPER_PRIVATE_KEY is not set. Put it in .env (Bun loads it automatically) and never commit it.",
  );
}
const privateKey = pk as `0x${string}`;
const account = privateKeyToAccount(privateKey);
const pub = createPublicClient({ chain, transport: http() });
const wallet = createWalletClient({ chain, account, transport: http() });

const ENGINE = (manifest as any).engine as `0x${string}`;
const REG = manifest.seriesRegistry as `0x${string}`;
const GUARD = (manifest as any).priceGuard as `0x${string}`;

const MIN_ELAPSED = 3600n; // accrue only when the stored norm is over an hour old
const BATCH = 20;
const INTERVAL_MS = Number(process.env.KEEPER_INTERVAL_MS ?? 60 * 60 * 1000);
const DRY_RUN = process.env.KEEPER_DRY_RUN === "true";

// OptionToken is a plain ERC20 for our purposes; only the supply matters here.
// `src/abi/generated.ts` does not export an OptionToken ABI, so keep this minimal
// instead of widening the generated file.
const ERC20SupplyAbi = [
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const satisfies Abi;

// SessionKind: REGULAR=0, EXTENDED=1, CLOSED=2, UNKNOWN=3, HALTED=4 (src/libs/OptionTypes.sol).
// Accrue only in a live session: when CLOSED the prices behind the accrual are hours
// old, so the keeper would pay gas to move funding against a stale mark. HALTED and
// UNKNOWN are skipped for the same reason.
const SESSION_REGULAR = 0;
const SESSION_EXTENDED = 1;

type DueSeries = { id: `0x${string}`; openInterest: bigint };

/**
 * Series that are worth accruing right now: not archived, open interest above zero,
 * and a stored accrual older than `MIN_ELAPSED`.
 */
export async function dueSeries(now: bigint): Promise<DueSeries[]> {
  const n = await pub.readContract({
    address: REG,
    abi: SeriesRegistryAbi as Abi,
    functionName: "seriesCount",
  });
  const count = Number(n);

  const due: DueSeries[] = [];
  for (let i = 0; i < count; i++) {
    const id = (await pub.readContract({
      address: REG,
      abi: SeriesRegistryAbi as Abi,
      functionName: "seriesIdAt",
      args: [BigInt(i)],
    })) as `0x${string}`;

    const s: any = await pub.readContract({
      address: REG,
      abi: SeriesRegistryAbi as Abi,
      functionName: "seriesOf",
      args: [id],
    });

    if (s.archived) continue;
    if (now - BigInt(s.lastAccrual) < MIN_ELAPSED) continue;

    const supply = (await pub.readContract({
      address: s.token,
      abi: ERC20SupplyAbi,
      functionName: "totalSupply",
    })) as bigint;
    if (supply === 0n) continue;

    due.push({ id, openInterest: supply });
  }
  return due;
}

export async function tick() {
  try {
    const session = Number(
      await pub.readContract({
        address: GUARD,
        abi: PriceGuardAbi as Abi,
        functionName: "getMarketSession",
      }),
    );
    if (session !== SESSION_REGULAR && session !== SESSION_EXTENDED) {
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          action: "accrueCheck",
          skipped: "market session is not live",
          session,
        }),
      );
      return;
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const due = await dueSeries(now);

    if (due.length === 0) {
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          action: "accrueCheck",
          dueCount: 0,
          skipped: "nothing due with open interest",
        }),
      );
      return;
    }

    if (DRY_RUN) {
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          action: "accrueDryRun",
          dueCount: due.length,
          series: due.map((d) => ({ id: d.id, openInterest: d.openInterest.toString() })),
          batches: Math.ceil(due.length / BATCH),
          note: "KEEPER_DRY_RUN=true: nothing signed",
        }),
      );
      return;
    }

    for (let i = 0; i < due.length; i += BATCH) {
      const ids = due.slice(i, i + BATCH).map((d) => d.id);
      const hash = await wallet.writeContract({
        address: ENGINE,
        abi: ArcumEngineAbi as Abi,
        functionName: "accrueMany",
        args: [ids],
      });
      const r = await pub.waitForTransactionReceipt({ hash });
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          action: "accrueMany",
          n: ids.length,
          tx: hash,
          status: r.status,
          gasUsed: r.gasUsed.toString(),
        }),
      );
    }
  } catch (e) {
    console.error(
      JSON.stringify({
        at: new Date().toISOString(),
        action: "accrueMany",
        error: String(e),
      }),
    );
    process.exitCode = 1;
  }
}

// Two modes, and the default has to be the one that does something. `bun run keeper` with no
// env set used to fall through both branches and exit having done nothing — a scheduled task
// that looks successful in the log and accrues nothing. So: daemon mode loops, otherwise run
// exactly one pass. Task Scheduler drives the hourly cadence and restarts a crashed process,
// which is why a single pass is the right unit of work there.
if (process.env.RUN_KEEPER_DAEMON === "true") {
  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      action: "keeperStart",
      intervalMs: INTERVAL_MS,
      dryRun: DRY_RUN,
      keeper: account.address,
    }),
  );
  tick();
  setInterval(tick, INTERVAL_MS);
} else {
  await tick();
}
