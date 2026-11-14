# Fix Kode Arcum — 14 Nov (Malam)

> Basis: commit `714c233`. Semua item di `FIX_KODE_ARCUM_14NOV_SORE.md` sudah selesai, kecuali MCP.
> Hasil cek: web build ✅, app `bun test` 34/34 ✅, `tsc` app ❌ (3 error).
> Estimasi kerja: ±45 menit. E2E dari web menyusul saat bursa AS buka.

---

## Konteks: MCP itu untuk apa

MCP adalah pintu bagi AI agent untuk trading di Arcum tanpa membuka web. Alurnya:

1. Owner set policy di `AgentRouter.setPolicy` (budget, max per trade, expiry). Ini sudah jalan on-chain.
2. Agent memanggil tool MCP `execute_trade` / `check_policy`.
3. MCP **membaca chain** lalu **menyusun tx unsigned** `buyFor(owner, seriesId, units, maxCost, deadline)`.
4. Agent menandatangani tx dengan key-nya sendiri, lalu mengirimnya.
5. Router mengecek policy, menarik USDG dari owner, dan token opsi masuk ke **owner**.

MCP tidak boleh memegang private key, dan tidak boleh mengarang data.

---

## 1. 🔴 `seriesId` nol semua → tx MCP pasti revert

**Lokasi:** `app/src/mcp/tools.ts:249`

```ts
const seriesId = "0x0000000000000000000000000000000000000000000000000000000000000000";
```

**Akibat:** router menerima seri yang tidak ada, jadi setiap tx dari agent gagal. Fitur "AI agent trading" tidak bisa dipakai.

**Ganti:** hitung `seriesId` dari registry (`idOf` memakai epoch saat ini), lalu validasi seri tersebut.

```ts
import { createPublicClient, http, getAddress, parseUnits, encodeFunctionData, zeroAddress } from "viem";
import { SeriesRegistryAbi, AgentRouterAbi } from "../abi/generated";

const RPC = process.env.RPC_URL ?? "https://rpc.testnet.chain.robinhood.com";
const client = createPublicClient({ transport: http(RPC) });

const STOCK_ADDR: Record<string, `0x${string}`> = manifest.stocks; // map simbol → alamat token (dari manifest)
const TAU: Record<"DAILY" | "WEEKLY", number> = { DAILY: 86_400, WEEKLY: 604_800 };

async function resolveSeries(input: { stock: string; isCall: boolean; strike: number; speed: "DAILY" | "WEEKLY" }) {
  const stock = STOCK_ADDR[input.stock];
  if (!stock) throw new Error(`Stock ${input.stock} belum terdaftar di manifest 46630`);

  const strikeWad = parseUnits(String(input.strike), 18);
  const id = await client.readContract({
    address: manifest.seriesRegistry as `0x${string}`,
    abi: SeriesRegistryAbi,
    functionName: "idOf",
    args: [stock, input.isCall, strikeWad, TAU[input.speed]],
  });

  const s = await client.readContract({
    address: manifest.seriesRegistry as `0x${string}`,
    abi: SeriesRegistryAbi,
    functionName: "seriesOf",
    args: [id],
  });
  if (s.stock === zeroAddress) throw new Error("Series tidak terdaftar untuk strike/tenor ini");
  if (!s.buyable || s.archived) throw new Error("Series tidak buyable (archived / di luar sesi)");
  return id;
}
```

> Manifest sekarang baru punya `"nvda"`. Jadi untuk testnet, pakai `{ NVDA: manifest.nvda }`, dan di schema `stock` cukup terima simbol yang sudah ada alamatnya. TSLA/SPY/QQQ/AAPL harus error "belum terdaftar", jangan pura-pura bisa. Jangan menulis alamat token langsung di dalam kode. Cek juga bahwa tipe `strike` (uint128, WAD) dan `tauSeconds` (uint32) di ABI generated sesuai.

## 2. 🔴 Owner invalid diam-diam jadi `0x0`

**Lokasi:** `tools.ts:251-256`

```ts
let ownerAddr = '0x0000…0000';
try { ownerAddr = getAddress(input.ownerAddress); } catch { /* fallback */ }
```

**Ganti:** biarkan error naik ke agent.

```ts
const ownerAddr = getAddress(input.ownerAddress); // throw kalau alamat salah
const agentAddr = getAddress(input.agentAddress);
```

## 3. 🔴 `handleCheckPolicy` mengembalikan angka palsu

**Lokasi:** `tools.ts` sekitar baris 213. Angka `2500`, `2150`, `250`, `status: "ACTIVE"` dan expiry +7 hari semuanya ditulis tetap di kode. Selain itu, `handleExecuteTrade` memakai limit `250.0` yang juga tetap.

**Akibat:** agent mengira punya budget padahal policy belum di-set atau sudah di-revoke.

**Ganti:** baca langsung dari chain dan pakai hasilnya di kedua handler.

```ts
async function readPolicy(owner: `0x${string}`, agent: `0x${string}`) {
  const p = await client.readContract({
    address: manifest.agentRouter as `0x${string}`,
    abi: AgentRouterAbi,
    functionName: "policyOf",
    args: [owner, agent],
  });
  const now = Math.floor(Date.now() / 1000);
  const active = p.agent !== zeroAddress && !p.revoked && Number(p.expiresAt) > now;
  return {
    status: p.revoked ? "REVOKED" : !active ? "INACTIVE" : "ACTIVE",
    budgetUsdg: Number(p.budgetUsdg) / 1e6,
    spentUsdg: Number(p.spentUsdg) / 1e6,
    remainingUsdg: Number(p.budgetUsdg - p.spentUsdg) / 1e6,
    maxPerTradeUsdg: Number(p.maxPerTradeUsdg) / 1e6,
    expiresAt: Number(p.expiresAt) * 1000,
    canSell: p.canSell,
    canShield: p.canShield,
  };
}

public static async handleCheckPolicy(input) {
  const owner = getAddress(input.ownerAddress);
  const agent = getAddress(input.agentAddress);
  return { ownerAddress: owner, agentAddress: agent, ...(await readPolicy(owner, agent)),
           isNonCustodial: true, recipientNote: "Token & proceeds selalu ke ownerAddress" };
}
```

Di `handleExecuteTrade`, ganti cek `> 250.0` menjadi:

```ts
const pol = await readPolicy(ownerAddr, agentAddr);
if (pol.status !== "ACTIVE") throw new Error(`Policy ${pol.status}`);
if (quote.totalCostUsdg > pol.maxPerTradeUsdg) throw new Error(`> maxPerTrade $${pol.maxPerTradeUsdg}`);
if (quote.totalCostUsdg > pol.remainingUsdg) throw new Error(`> sisa budget $${pol.remainingUsdg}`);
```

> Kedua handler sekarang `async`. Update pemanggil di router MCP dan di `app/test/mcp.test.ts` (pakai `await`, lalu mock `client.readContract`).

## 4. 🟠 Quote MCP masih off-chain

`handleQuote` memakai `priceEverlasting` lokal. Untuk tx yang akan dikirim, `maxCost` sebaiknya diambil dari `engine.quoteBuy(seriesId, units)` on-chain (field `usdg`, 6dp), ditambah slippage kecil (misal 1%). Kalau tidak, angka yang dilihat agent bisa beda dengan harga yang ditagih kontrak.

## 5. 🟡 `tsc` app gagal (sisa commit d0f77cc)

**Lokasi:** `app/src/api/server.ts:41-44`

```
indexer: { running: true, lag: 0 }                   // kurang lastBlock
hedger:  { running: false, note: '...' }             // 'note' tidak ada di tipe
volEngine: { running: false, note: '...' }
```

**Ganti:** tambahkan `note?: string` di tipe `ServiceHealth` untuk hedger/volEngine, dan isi `lastBlock` dari indexer asli (atau `lastBlock: 0` plus `note: 'not started'`). Hasilnya `npx tsc --noEmit` di `app/` harus bersih.

---

## Cek akhir (wajib sebelum push)

```bash
grep -n '0x0000000000000000000000000000000000000000000000000000000000000000' app/src/mcp/tools.ts   # harus kosong
grep -nE '2500\.0|2150\.0|250\.0' app/src/mcp/tools.ts                                            # harus kosong
cd app && npx tsc --noEmit && bun test
cd ../web && npm run build
```

**Uji nyata (tanpa jam bursa juga bisa):** jalankan `check_policy` untuk owner `0x04ef238C3B757F87175028c4Bfd81809cA2c03c1` dengan agent yang pernah di-set. Hasilnya harus `REVOKED`, karena policy sudah di-revoke on-chain. Kalau masih `ACTIVE`, berarti masih pakai data palsu.

`execute_trade` di luar jam bursa harus error "tidak buyable", bukan mengembalikan tx.
