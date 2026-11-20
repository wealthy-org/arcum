import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
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

// Fail closed: a deploy key belongs in the environment, never as a literal in a tracked file.
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
const MIN_ELAPSED = 3600n; // accrue kalau sudah > 1 jam
const BATCH = 20;

// SessionKind: REGULAR=0, EXTENDED=1, CLOSED=2, UNKNOWN=3, HALTED=4 (src/libs/OptionTypes.sol).
// Accrue hanya di sesi hidup: saat CLOSED harga bisa sudah berjam-jam dan accrue hanya
// membakar gas untuk memindahkan funding ke harga basi. Saat HALTED/UNKNOWN juga tidak.
const SESSION_REGULAR = 0;
const SESSION_EXTENDED = 1;

export async function tick() {
  try {
    const session = Number(
      await pub.readContract({
        address: GUARD,
        abi: PriceGuardAbi,
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

    const n = await pub.readContract({
      address: REG,
      abi: SeriesRegistryAbi,
      functionName: "seriesCount",
    });
    const now = BigInt(Math.floor(Date.now() / 1000));
    const due: `0x${string}`[] = [];

    for (let i = 0n; i < n; i++) {
      const id = await pub.readContract({
        address: REG,
        abi: SeriesRegistryAbi,
        functionName: "seriesIdAt",
        args: [i],
      });
      const s = await pub.readContract({
        address: REG,
        abi: SeriesRegistryAbi,
        functionName: "seriesOf",
        args: [id],
      });
      if (!s.archived && now - s.lastAccrual >= MIN_ELAPSED) {
        due.push(id);
      }
    }

    if (due.length === 0) {
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          action: "accrueCheck",
          dueCount: 0,
        }),
      );
      return;
    }

    for (let i = 0; i < due.length; i += BATCH) {
      const ids = due.slice(i, i + BATCH);
      const hash = await wallet.writeContract({
        address: ENGINE,
        abi: ArcumEngineAbi,
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
  }
}

if (process.env.RUN_KEEPER_DAEMON === "true") {
  tick();
  setInterval(tick, 15 * 60 * 1000);
}
