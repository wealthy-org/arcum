# Arcum: Panduan Kode Perbaikan (14 Nov 2026)

> **Untuk:** dev Arcum
> **Pasangan dari:** `UPDATE_ARCUM_14NOV.md` (dokumen itu menjelaskan *apa* dan *kenapa*; dokumen ini menjelaskan *kodenya*)
> **Dasar:** commit `841c6bb`. Semua nama fungsi, struct dan event di bawah sudah dicocokkan dengan `contracts/src/` di commit itu.

Format setiap bagian:
- **❌ Sekarang:** kode yang ada dan salah (dengan lokasi file).
- **✅ Ganti jadi:** kode pengganti.
- **➕ Belum ada:** contoh kode baru.

Contoh kode memakai stack yang sudah ada di repo: React + wagmi v2 + viem + `@tanstack/react-query`. Sesuaikan nama import/path kalau berbeda.

---

## Daftar isi
- [0. Fondasi](#0-fondasi-wajib-dikerjakan-pertama)
  - 0.1 ABI salah (policyOf) dan ABI yang kurang
  - 0.2 Helper tx: tunggu receipt + link Blockscout
- [1. Series dan strike dari chain (#1)](#1-series-dan-strike-dari-chain-1)
- [2. Harga dan quote dari chain (#2)](#2-harga-dan-quote-dari-chain-2)
- [3. Positions dan Sell (#3)](#3-positions-dan-sell-3)
- [4. Shield (#4, H12, H21)](#4-shield-4-h12-h21)
- [5. Writer Pool (#5, #8 INITIAL_POOL_STATS, H10)](#5-writer-pool-5-8-h10)
- [6. Agent (#6)](#6-agent-6)
- [7. Activity (#7)](#7-activity-7)
- [8. Hardcode tersisa (#8)](#8-hardcode-tersisa-8)
- [9. Kontrak: shieldFor (#11)](#9-kontrak-shieldfor-11)
- [10. Fork test asli (#12)](#10-fork-test-asli-12)
- [11. Manifest library (#13)](#11-manifest-library-13)
- [12. Keeper, indexer, quickstart, MCP (#14)](#12-keeper-indexer-quickstart-mcp-14)
- [13. Rute (#15)](#13-rute-15)
- [14. Teks klaim (L, M, N, P)](#14-teks-klaim-l-m-n-p)
- [15. Cek akhir](#15-cek-akhir)

---

## 0. Fondasi (wajib dikerjakan pertama)

### 0.1 ABI salah dan ABI yang kurang

**❌ Sekarang: `web/src/contracts/abis.ts` — `policyOf` urutan field salah (BUG)**
```ts
'function policyOf(address owner, address agent) external view returns ((uint128 budgetUsdg, uint128 maxPerTradeUsdg, uint64 expiresAt, bool canSell, bool canShield, uint128 spentUsdg, bool revoked))',
```
Struct di kontrak (`IAgentRouter.sol:11-20`) dimulai dengan `address agent`, lalu `budgetUsdg, spentUsdg, maxPerTradeUsdg, expiresAt, canSell, canShield, revoked`. Karena urutan dan jumlah field berbeda, **semua angka policy yang di-decode akan salah** (misalnya `budgetUsdg` berisi alamat agent).

**✅ Ganti jadi:**
```ts
'function policyOf(address owner, address agent) external view returns ((address agent, uint128 budgetUsdg, uint128 spentUsdg, uint128 maxPerTradeUsdg, uint64 expiresAt, bool canSell, bool canShield, bool revoked))',
```

**➕ Tambahkan yang belum ada:**
```ts
// ARCUM_ENGINE_ABI
'function vMark(bytes32 id) external view returns (uint256 vWad, uint256 payoffWad, uint64 sigmaBps, uint8 session)',
'function cancelQueued(uint256 ticket) external',
'event Bought(bytes32 indexed id, address indexed account, address recipient, uint256 units, uint256 tokens, uint256 usdgPaid, uint256 vMarkWad, uint64 sigmaBps, uint8 session)',
'event Sold(bytes32 indexed id, address indexed account, address recipient, uint256 units, uint256 tokens, uint256 usdgReceived, uint256 vMarkWad, uint64 sigmaBps, uint8 session)',
'event ShieldBought(address indexed account, address indexed stock, bytes32 indexed id, uint256 tokenUnits, uint256 usdgPaid)',
'event SellQueued(uint256 indexed ticket, bytes32 indexed id, address indexed seller, address recipient, uint128 tokens, uint64 queuedAt)',

// WRITER_POOL_ABI
'function maxOutstandingBps() external view returns (uint16)',
'function maxPerNameBps() external view returns (uint16)',
'function lockSeconds() external view returns (uint32)',
'function ticketOf(uint256 ticket) external view returns (address owner, uint256 shares, uint64 claimableAt)',
'function CLAIM_WINDOW() external view returns (uint256)',
'event WithdrawalQueued(address indexed owner, uint256 indexed ticket, uint256 shares, uint64 claimableAt)',
'event WithdrawalClaimed(address indexed owner, uint256 indexed ticket, uint256 usdg)',
'event Transfer(address indexed from, address indexed to, uint256 value)',

// SERIES_REGISTRY_ABI
'event SeriesListed(bytes32 indexed id, address indexed stock, bool isCall, uint8 speed, uint128 strike, address token)',

// AGENT_ROUTER_ABI
'event PolicySet(address indexed owner, address indexed agent, uint128 budgetUsdg, uint128 maxPerTradeUsdg, uint64 expiresAt, bool canSell, bool canShield)', // sudah dicocokkan dengan IAgentRouter.sol:22
'event PolicyRevoked(address indexed owner, address indexed agent)',
'event AgentTrade(address indexed owner, address indexed agent, bytes32 indexed seriesId, bool isBuy, uint256 usdg)',
```
> **Lebih aman:** generate ABI dari `contracts/out/*.json` (hasil `forge build`) supaya tidak ada lagi ABI yang ditulis tangan:
> ```bash
> # scripts/gen-abi.mjs
> import fs from 'node:fs';
> const names = ['ArcumEngine','WriterPool','AgentRouter','SeriesRegistry','PriceGuard'];
> let out = '// AUTO-GENERATED dari forge build. Jangan diedit manual.\n';
> for (const n of names) {
>   const { abi } = JSON.parse(fs.readFileSync(`contracts/out/${n}.sol/${n}.json`, 'utf8'));
>   out += `export const ${n}Abi = ${JSON.stringify(abi)} as const;\n`;
> }
> fs.writeFileSync('web/src/contracts/generated.ts', out);
> ```

**Satu sumber alamat.** Saat ini ada dua: `TESTNET_CONTRACT_ADDRESSES` (`data/protocol.ts`, kunci `engineProxy`, `writerPoolProxy`) dan `ARCUM_TESTNET_CONTRACTS` (`config/wagmi.ts`, kunci `engine`, `writerPool`). Hook baca memakai yang kedua, handler tulis di `DashboardPage` memakai yang pertama. Pilih **satu** (disarankan `ARCUM_TESTNET_CONTRACTS`, diisi dari `deployments/46630.json`) dan hapus yang lain.

```ts
// web/src/config/contracts.ts
import manifest from '../../../deployments/46630.json';
export const C = {
  usdg: manifest.usdg as `0x${string}`,
  engine: manifest.engineProxy as `0x${string}`,   // nama kunci menyesatkan: engine BUKAN proxy (lihat §9)
  writerPool: manifest.writerPoolProxy as `0x${string}`,
  agentRouter: manifest.agentRouter as `0x${string}`,
  seriesRegistry: manifest.seriesRegistry as `0x${string}`,
  priceGuard: manifest.priceGuard as `0x${string}`,
  deployBlock: BigInt(manifest.deployBlock ?? 0),
} as const;
```
> Kalau `deployBlock` belum ada di manifest, tambahkan (blok tx deploy pertama). Dipakai untuk membaca event (§3, §5, §7).

### 0.2 Helper tx: toast sukses hanya setelah receipt

**❌ Sekarang (`DashboardPage.tsx`, semua handler):**
```ts
const txHash = await writeContractAsync({ ... });
setPositions(...);               // state diubah sebelum tx terkonfirmasi
showToast('Position Closed On-Chain', `Sold on testnet! Tx: ${txHash...}`, 'success');
```

**➕ Buat helper `web/src/hooks/useTx.ts`:**
```ts
import { useWriteContract, usePublicClient } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { BaseError, ContractFunctionRevertedError } from 'viem';

const EXPLORER = 'https://explorer.testnet.chain.robinhood.com/tx/';

export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: 46630 });
  const qc = useQueryClient();

  async function send(req: Parameters<typeof writeContractAsync>[0], label: string,
                      toast: (t: string, m: string, k: 'info'|'success'|'error') => void) {
    try {
      // 1) simulasi dulu: error kontrak ketahuan sebelum user bayar gas
      await client!.simulateContract({ ...(req as any), account: (req as any).account });
      toast(label, 'Confirm in your wallet…', 'info');
      const hash = await writeContractAsync(req);
      toast(label, 'Waiting for confirmation…', 'info');
      const receipt = await client!.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error(`Reverted: ${EXPLORER}${hash}`);
      await qc.invalidateQueries();            // semua hook baca refetch
      toast(label, `Confirmed. ${EXPLORER}${hash}`, 'success');
      return receipt;
    } catch (e) {
      toast(label, decodeError(e), 'error');
      throw e;
    }
  }
  return { send };
}

export function decodeError(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    if (revert?.data?.errorName) return `${revert.data.errorName}${revert.data.args ? ' ' + revert.data.args.join(', ') : ''}`;
    if (e.shortMessage.includes('User rejected')) return 'Rejected in wallet. No funds moved.';
    return e.shortMessage;
  }
  return String(e);
}
```
> Agar `errorName` ter-decode (misalnya `ShieldExceedsHolding`, `SeriesNotBuyable`), ABI harus memuat `error ...`. Ini salah satu alasan memakai ABI hasil generate (0.1).

**Aturan:** setelah ini, **tidak ada** `setPositions` / `setPoolStats` / `setAgentPolicy` di Live Mode. Data selalu dari hook baca, dan `invalidateQueries()` membuatnya refetch setelah receipt.

---

## 1. Series dan strike dari chain (#1)

**❌ Sekarang: `web/src/utils/series.ts`**
```ts
export function computeSeriesId(stockAddress, isCall, strikeNum, speed, epoch: number = 0) { ... } // epoch dipatok 0
export function getListedStrikes(symbol, side, speed): number[] {
  if (symbol === 'NVDA') { if (side === 'UP' && speed === 'DAILY') return [138, 141, 144, 147, 150]; ... }
  ...
  return [138, 141, 144, 147, 150];   // fallback NVDA untuk semua aset
}
```

**✅ Ganti jadi: `web/src/hooks/chain/useSeriesList.ts`** (baca semua series sekali, lalu filter di UI)
```ts
import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { SERIES_REGISTRY_ABI } from '../../contracts/abis';
import { C } from '../../config/contracts';

export type ListedSeries = {
  id: `0x${string}`; stock: `0x${string}`; isCall: boolean; tauSeconds: number;
  strike: number; strikeWad: bigint; token: `0x${string}`; norm: bigint;
  buyable: boolean; archived: boolean;
};

export function useSeriesList() {
  const { data: count } = useReadContract({
    address: C.seriesRegistry, abi: SERIES_REGISTRY_ABI, functionName: 'seriesCount',
    query: { refetchInterval: 60_000 },
  });
  const n = Number(count ?? 0n);

  const { data: ids } = useReadContracts({
    contracts: Array.from({ length: n }, (_, i) => ({
      address: C.seriesRegistry, abi: SERIES_REGISTRY_ABI, functionName: 'seriesIdAt', args: [BigInt(i)],
    } as const)),
    query: { enabled: n > 0 },
  });
  const idList = (ids ?? []).map((r) => r.result).filter(Boolean) as `0x${string}`[];

  const { data: infos, ...rest } = useReadContracts({
    contracts: idList.map((id) => ({
      address: C.seriesRegistry, abi: SERIES_REGISTRY_ABI, functionName: 'seriesOf', args: [id],
    } as const)),
    query: { enabled: idList.length > 0, refetchInterval: 60_000 },
  });

  const series: ListedSeries[] = (infos ?? []).flatMap((r, i) => {
    const s = r.result as any;
    if (!s) return [];
    return [{
      id: idList[i], stock: s.stock, isCall: s.isCall, tauSeconds: Number(s.tauSeconds),
      strike: Number(formatUnits(s.strike, 18)), strikeWad: s.strike, token: s.token,
      norm: s.norm, buyable: s.buyable, archived: s.archived,
    }];
  });
  return { series, ...rest };
}

/** Strike yang bisa dibeli untuk kombinasi yang dipilih user. */
export function strikesFor(series: ListedSeries[], stock: string, isCall: boolean, tauSeconds: number) {
  return series
    .filter((s) => s.stock.toLowerCase() === stock.toLowerCase()
      && s.isCall === isCall && s.tauSeconds === tauSeconds && s.buyable && !s.archived)
    .sort((a, b) => a.strike - b.strike);
}
```

**✅ Di `DashboardPage.tsx`:**
```ts
// ❌ hapus
const strikes = getListedStrikes(selectedStock.symbol, selectedSide, selectedSpeed);
const computedSeriesId = computeSeriesId(...);

// ✅ ganti
const { series } = useSeriesList();
const tau = selectedSpeed === 'DAILY' ? 86400 : 604800;
const listed = strikesFor(series, selectedStock.address, selectedSide === 'UP', tau);
const selected = listed.find((s) => s.strike === selectedStrike) ?? listed[0];
const seriesId = selected?.id;          // ID langsung dari registry → epoch otomatis benar
const canBuy = !!selected && !isWrongChain;
```
```tsx
{listed.length === 0
  ? <p className="text-sm opacity-70">No listed series for this market.</p>
  : listed.map((s) => <StrikeRow key={s.id} series={s} ... />)}

<button disabled={!canBuy || !quote}>Buy</button>
```
Hapus `computeSeriesId` dan `getListedStrikes` dari `utils/series.ts`.

---

## 2. Harga dan quote dari chain (#2)

### 2.1 Harga

**❌ Sekarang: `data/protocol.ts` `INITIAL_STOCKS`**
```ts
{ symbol: 'NVDA', price: 142.50, change24h: 3.42, address: '0x98a7…' }
```
**✅ Ganti jadi:** `INITIAL_STOCKS` hanya menyimpan identitas (symbol, nama, address). Harga dibaca:
```ts
// web/src/hooks/chain/usePrices.ts
import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { PRICE_GUARD_ABI } from '../../contracts/abis';
import { C } from '../../config/contracts';

export function usePrices(stocks: { address: `0x${string}` }[]) {
  const { data, isError } = useReadContracts({
    contracts: stocks.map((s) => ({
      address: C.priceGuard, abi: PRICE_GUARD_ABI, functionName: 'readLite', args: [s.address],
    } as const)),
    query: { refetchInterval: 10_000 },
  });
  return stocks.map((s, i) => {
    const r = data?.[i]?.result as any;
    return {
      address: s.address,
      price: r ? Number(formatUnits(r.s, 18)) : null,   // null → tampilkan "—"
      fresh: r?.fresh ?? false,
      buysPaused: r?.buysPaused ?? false,
      session: r?.session as number | undefined,
      error: isError,
    };
  });
}
```
```tsx
<span>{p.price == null ? '—' : `$${p.price.toFixed(2)}`}</span>
{!p.fresh && <span className="badge">Stale price</span>}
{p.buysPaused && <span className="badge">Buys paused</span>}
```

### 2.2 Quote

**❌ Sekarang:** `currentQuote` dihitung di browser (Black-Scholes lokal, ±baris 640–700) dan dipakai untuk `maxCost` di `useOnChainTrade.ts`.

**✅ Ganti jadi:**
```ts
import { parseUnits, formatUnits } from 'viem';
const unitsWad = parseUnits(String(tradeUnits || 0), 18);
const { data: q } = useOnChainQuote(seriesId, unitsWad, true); // hook sudah ada, tinggal dipakai

const view = q && {
  totalUsdg: Number(formatUnits(q.usdg, 6)),
  feeUsdg: Number(formatUnits(q.feeUsdg, 6)),
  dailyCostUsdg: Number(formatUnits(q.dailyCostUsdg, 6)),
  markPerUnit: Number(formatUnits(q.vMarkWad, 18)),
  breakeven: Number(formatUnits(q.breakevenWad, 18)),
  buyable: q.buyable,
};
```
```tsx
<Row label="Mark Price (Unit)" value={view ? `${view.markPerUnit.toFixed(3)} USDG` : '—'} />
<Row label="Est. Daily Cost"   value={view ? `-$${view.dailyCostUsdg.toFixed(3)} / day` : '—'} />
<Row label="Protocol Fee"      value={view ? `$${view.feeUsdg.toFixed(3)}` : '—'} />
<Row label="Total Settlement"  value={view ? `$${view.totalUsdg.toFixed(2)} USDG` : '—'} />
<button disabled={!view?.buyable}>Buy</button>
```
`Delta` bukan bagian dari `Quote` kontrak. Kalau tetap ditampilkan, beri label "est." dan jangan dipakai untuk perhitungan.

### 2.3 Buy: approve tepat dari quote on-chain

**❌ Sekarang: `useOnChainTrade.ts`** — `costRaw` berasal dari `totalCostUsdg` lokal.

**✅ Ganti jadi:**
```ts
const maxCost = (q.usdg * 105n) / 100n;                     // q dari engine.quote
const allowance = await client.readContract({ address: C.usdg, abi: ERC20_ABI, functionName: 'allowance', args: [user, C.engine] });
if (allowance < maxCost) {
  await send({ address: C.usdg, abi: ERC20_ABI, functionName: 'approve', args: [C.engine, maxCost] }, 'Approve USDG', toast);
}
await send({
  address: C.engine, abi: ARCUM_ENGINE_ABI, functionName: 'buy',
  args: [seriesId, unitsWad, maxCost, BigInt(Math.floor(Date.now() / 1000) + 600), user],
}, 'Buy', toast);
```

---

## 3. Positions dan Sell (#3)

**❌ Sekarang: `DashboardPage.tsx:229-245`**
```ts
const newPos: UserPosition = { id: `pos-${Date.now()}`, seriesId, ..., norm: 1.0, effectiveUnits: tradeUnits, ... };
setPositions((prev) => [newPos, ...prev]);
```
**✅ Ganti jadi: `web/src/hooks/chain/usePositions.ts`**
```ts
import { useAccount, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { ERC20_ABI, ARCUM_ENGINE_ABI } from '../../contracts/abis';
import { C } from '../../config/contracts';
import { useSeriesList } from './useSeriesList';

const WAD = 10n ** 18n;

export function usePositions() {
  const { address } = useAccount();
  const { series } = useSeriesList();

  // 1) saldo token option per series (setiap series = ERC20 sendiri, alamat di Series.token)
  const { data: bals } = useReadContracts({
    contracts: series.map((s) => ({ address: s.token, abi: ERC20_ABI, functionName: 'balanceOf', args: [address!] } as const)),
    query: { enabled: !!address && series.length > 0, refetchInterval: 15_000 },
  });
  const held = series
    .map((s, i) => ({ s, tokens: (bals?.[i]?.result as bigint) ?? 0n }))
    .filter((x) => x.tokens > 0n);

  // 2) effective units = tokens × norm (sama dengan ArcumEngine.sol:177), lalu quote bid
  const withUnits = held.map(({ s, tokens }) => ({ s, tokens, units: (tokens * s.norm) / WAD }));
  const { data: bids } = useReadContracts({
    contracts: withUnits.map((x) => ({
      address: C.engine, abi: ARCUM_ENGINE_ABI, functionName: 'quote', args: [x.s.id, x.units, false],
    } as const)),
    query: { enabled: withUnits.length > 0, refetchInterval: 15_000 },
  });

  return withUnits.map((x, i) => {
    const q = bids?.[i]?.result as any;
    return {
      seriesId: x.s.id, stock: x.s.stock, isCall: x.s.isCall, tauSeconds: x.s.tauSeconds, strike: x.s.strike,
      tokensRaw: x.tokens,                                      // dipakai untuk sell (persis saldo)
      tokens: Number(formatUnits(x.tokens, 18)),
      norm: Number(formatUnits(x.s.norm, 18)),
      effectiveUnits: Number(formatUnits(x.units, 18)),
      valueUsdg: q ? Number(formatUnits(q.usdg, 6)) : null,
      bidRaw: q?.usdg as bigint | undefined,
      dailyCostUsdg: q ? Number(formatUnits(q.dailyCostUsdg, 6)) : null,
    };
  });
}
```
> `norm` di registry diperbarui saat `accrue`. Supaya nilai tidak basi, keeper (§12) harus berjalan. Alternatif: tampilkan juga `lastAccrual` sebagai "updated X min ago".

**Entry price / PnL:** ambil dari event `Bought` milik user (lihat §7), jumlahkan `usdgPaid` per `id`. Jangan disimpan di state lokal.

**❌ Sekarang: `handleClosePosition`**
```ts
const unitsWad = parseUnits(pos.rawTokens.toString(), 18);                 // angka lokal
const minProceeds = BigInt(Math.max(1, Math.floor(pos.currentValueUsdg * 0.9 * 1_000_000)));
const txHash = await writeContractAsync({ ... functionName: 'sell', ... });
setPositions((prev) => prev.filter((p) => p.id !== posId));
showToast('Position Closed On-Chain', ...);
```
**✅ Ganti jadi:**
```ts
async function closePosition(p: ReturnType<typeof usePositions>[number]) {
  if (!p.bidRaw) return;
  const minProceeds = (p.bidRaw * 98n) / 100n;                              // slippage 2% dari bid on-chain
  await send({
    address: C.engine, abi: ARCUM_ENGINE_ABI, functionName: 'sell',
    args: [p.seriesId, p.tokensRaw, minProceeds, BigInt(Math.floor(Date.now() / 1000) + 600), user],
  }, 'Close position', toast);
  // tidak perlu setPositions: invalidateQueries di useTx membuat usePositions refetch
}
```
> Kalau session HALTED, engine bisa mengantrekan sell (`SellQueued`). Tampilkan tiket antrean dan tombol `cancelQueued(ticket)` (brief §24 no. 3).

---

## 4. Shield (#4, H12, H21)

**❌ Sekarang: `handleExecuteShield`**
```ts
const tokenUnits = parseUnits('10', 18);
const pctBps = 500;
const maxCost = 500_000_000n;
await writeContractAsync({ ... functionName: 'approve', args: [engine, maxCost] });
```
**❌ Teks: `DashboardPage.tsx:1057-1066`**
```tsx
{selectedStock.symbol} Weekly Put ${(selectedStock.price * 0.95).toFixed(2)}
<span>95.0% Portfolio Value</span>
<span>~0.71% of Portfolio</span>
```

**✅ Ganti jadi:** pilih series di UI dengan logika **yang sama persis** dengan `ArcumEngine.shield` (`ArcumEngine.sol:229-247`), lalu quote untuk series itu.
```ts
const [shieldQty, setShieldQty] = useState('');        // input user, jumlah stock token
const [shieldPct, setShieldPct] = useState(5);          // input user, % di bawah harga

const { data: stockBal } = useReadContract({
  address: selectedStock.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [user!],
  query: { enabled: !!user },
});
const { data: putIds } = useReadContract({
  address: C.engine, abi: ARCUM_ENGINE_ABI, functionName: 'shieldList', args: [selectedStock.address],
});
const price = prices.find((p) => p.address === selectedStock.address)?.price;

const puts = series.filter((s) => putIds?.includes(s.id));
const target = price != null ? price * (1 - shieldPct / 100) : null;
// sama dengan engine: strike terbesar ≤ target; kalau tidak ada, strike terendah
const pick = target == null ? undefined
  : (puts.filter((s) => s.strike <= target).sort((a, b) => b.strike - a.strike)[0]
     ?? [...puts].sort((a, b) => a.strike - b.strike)[0]);

const qtyWad = shieldQty ? parseUnits(shieldQty, 18) : 0n;
const { data: sq } = useOnChainQuote(pick?.id, qtyWad, true);

const overHolding = stockBal !== undefined && qtyWad > (stockBal as bigint);
const canShield = !!pick && !!sq?.buyable && qtyWad > 0n && !overHolding;

async function buyShield() {
  const maxCost = (sq!.usdg * 105n) / 100n;
  await send({ address: C.usdg, abi: ERC20_ABI, functionName: 'approve', args: [C.engine, maxCost] }, 'Approve USDG', toast);
  await send({
    address: C.engine, abi: ARCUM_ENGINE_ABI, functionName: 'shield',
    args: [selectedStock.address, qtyWad, Math.round(shieldPct * 100), maxCost, BigInt(Math.floor(Date.now() / 1000) + 600)],
  }, 'Buy Shield', toast);
}
```
```tsx
<input value={shieldQty} onChange={(e) => setShieldQty(e.target.value)} placeholder="Stock tokens to protect" />
<small>You hold {stockBal !== undefined ? formatUnits(stockBal as bigint, 18) : '—'} {selectedStock.symbol}</small>
<input type="range" min={1} max={30} value={shieldPct} onChange={(e) => setShieldPct(+e.target.value)} />

<Row label="Listed Weekly Put" value={pick ? `$${pick.strike.toFixed(2)}` : 'No listed put'} />
<Row label="Cost" value={sq ? `$${Number(formatUnits(sq.usdg, 6)).toFixed(2)} USDG` : '—'} />
<Row label="Daily holding cost" value={sq ? `$${Number(formatUnits(sq.dailyCostUsdg, 6)).toFixed(3)}` : '—'} />
{overHolding && <p className="text-red-400">Amount exceeds your {selectedStock.symbol} balance.</p>}
<p className="text-xs opacity-70">
  Shield buys a decaying weekly put. It is not a permanent price floor and does not renew automatically.
</p>
<button disabled={!canShield} onClick={buyShield}>Buy Shield</button>
```
> **Catatan:** pemilihan di UI hanya untuk *tampilan*. Yang menentukan series adalah kontrak. Setelah tx, baca `id` dari event `ShieldBought` dan tampilkan strike sebenarnya.

**H21 — hapus kata "Automated":**
```diff
- 1-Click Automated Shield Protection
+ Shield: weekly put protection
- Automated institutional downside hedging for tokenized stock portfolios.
+ Buy a listed weekly put sized to your Stock Token holding.
```
Juga `ProductsPage.tsx:103`: hapus "Automated … Automatically selects the optimal" → "Selects the listed weekly put closest below your chosen protection level."

---

## 5. Writer Pool (#5, #8, H10)

### 5.1 Data pool dari chain (ganti `INITIAL_POOL_STATS`)

**❌ Sekarang:** `const [poolStats, setPoolStats] = useState(INITIAL_POOL_STATS);`

**✅ Ganti jadi:**
```ts
const { data } = useReadContracts({
  contracts: [
    { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'nav' },
    { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'navPerShare' },
    { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'totalSupply' },
    { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'maxOutstandingBps' },
    { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'lockSeconds' },
    { address: C.engine,     abi: ARCUM_ENGINE_ABI, functionName: 'totalLiability' },
    { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'balanceOf', args: [user!] },
    { address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'unlockTime', args: [user!] },
  ],
  query: { refetchInterval: 15_000 },
});
const [nav, nps, supply, capBps, lockSec, liab, myShares, unlockAt] = (data ?? []).map((r) => r.result);

const pool = data && {
  navUsdg: Number(formatUnits(nav as bigint, 18)),             // nav() mengembalikan WAD (int256)
  navPerShare: Number(formatUnits(nps as bigint, 18)),          // cek skala di WriterPool.navPerShare
  totalShares: Number(formatUnits(supply as bigint, 18)),
  riskCapPct: Number(capBps) / 100,                             // H10
  lockMinutes: Number(lockSec) / 60,
  liabilityUsdg: Number(formatUnits(liab as bigint, 18)),
  myShares: myShares as bigint,
  unlockAt: Number(unlockAt) * 1000,
};
```
> Pastikan skala `navPerShare` dengan membaca `WriterPool.sol` (share 18 desimal = USDG 6 + offset 12). Uji: `navPerShare × totalSupply ≈ nav`.

**H10 — Risk cap:**
```diff
- <span>Writer Pool Risk Cap: <strong>35.0% NAV</strong></span>
+ <span>Writer Pool Risk Cap: <strong>{pool ? `${pool.riskCapPct.toFixed(1)}% NAV` : '—'}</strong></span>
```

**Zero pool (brief §4):**
```tsx
{pool && pool.navUsdg < 1 && (
  <Banner tone="warning">Pool is empty. Option buys are limited until writers deposit.</Banner>
)}
```

### 5.2 Request withdraw: unit salah

**❌ Sekarang:**
```ts
const sharesRaw = BigInt(Math.round(withdrawShares));   // "5" → 5 wei share
```
**✅ Ganti jadi:**
```ts
const sharesRaw = parseUnits(String(withdrawShares), 18);
if (sharesRaw === 0n || sharesRaw > pool.myShares) return toast('Withdraw', 'Amount exceeds your shares.', 'error');
if (Date.now() < pool.unlockAt) return toast('Withdraw', `Locked until ${new Date(pool.unlockAt).toLocaleString()}`, 'error');
await send({ address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'requestWithdraw', args: [sharesRaw] }, 'Request withdraw', toast);
```
Tambahkan tombol **Max** = `formatUnits(pool.myShares, 18)`.

### 5.3 Tiket penarikan dan Claim (belum ada)

Requeue terjadi **otomatis di dalam `claim()`** (`WriterPool.sol` ±305–308): kalau diklaim setelah `claimableAt + CLAIM_WINDOW` (7 hari), tiket dijadwalkan ulang dan `WithdrawalQueued` dipancarkan lagi. Partial payout: satu klaim per hari mendapat bagian pro-rata, sisanya tetap bisa diklaim.

**➕ `web/src/hooks/chain/useWithdrawTickets.ts`:**
```ts
import { useAccount, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { parseAbiItem } from 'viem';
import { C } from '../../config/contracts';
import { WRITER_POOL_ABI } from '../../contracts/abis';

const CLAIM_WINDOW = 7 * 24 * 3600;

export function useWithdrawTickets() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: 46630 });
  return useQuery({
    queryKey: ['tickets', address],
    enabled: !!address && !!client,
    refetchInterval: 30_000,
    queryFn: async () => {
      const queued = await client!.getLogs({
        address: C.writerPool,
        event: parseAbiItem('event WithdrawalQueued(address indexed owner, uint256 indexed ticket, uint256 shares, uint64 claimableAt)'),
        args: { owner: address }, fromBlock: C.deployBlock,
      });
      const ticketIds = [...new Set(queued.map((l) => l.args.ticket!))];
      const now = Math.floor(Date.now() / 1000);
      // status terakhir dibaca langsung dari kontrak, bukan dari event pertama
      return Promise.all(ticketIds.map(async (id) => {
        const [owner, shares, claimableAt] = await client!.readContract({
          address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'ticketOf', args: [id],
        });
        const at = Number(claimableAt);
        const status =
          shares === 0n ? 'done'
          : now < at ? 'waiting'
          : now > at + CLAIM_WINDOW ? 'expired'      // claim akan requeue, bukan membayar
          : 'claimable';
        return { id, owner, shares, claimableAt: at, status };
      }));
    },
  });
}
```
> Kalau batas blok `getLogs` RPC terlalu kecil, pecah per 50.000 blok.

**➕ UI:**
```tsx
{tickets?.filter((t) => t.status !== 'done').map((t) => (
  <tr key={String(t.id)}>
    <td>#{String(t.id)}</td>
    <td>{formatUnits(t.shares, 18)} shares</td>
    <td>
      {t.status === 'waiting'   && `Claimable ${new Date(t.claimableAt * 1000).toLocaleString()}`}
      {t.status === 'claimable' && 'Ready to claim (may pay partially if pool cash is short)'}
      {t.status === 'expired'   && 'Claim window passed. Claiming will requeue the ticket.'}
    </td>
    <td>
      <button disabled={t.status === 'waiting'}
        onClick={() => send({ address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'claim', args: [t.id] }, 'Claim', toast)}>
        {t.status === 'expired' ? 'Requeue' : 'Claim'}
      </button>
    </td>
  </tr>
))}
```

### 5.4 Deposit
Sudah mengirim tx. Ganti saja ke `send()` (0.2), dan sebelum kirim cek `publicDeposits()` serta `maxDeposit(user)`. Hapus `setPoolStats` di cabang Live.

---

## 6. Agent (#6)

**❌ Sekarang: `handleToggleAgentRevoke`**
```ts
const newRevoked = !agentPolicy.revoked;
setAgentPolicy((prev) => ({ ...prev, revoked: newRevoked }));
showToast(newRevoked ? 'Agent Policy Revoked' : 'Agent Policy Restored',
  'AgentRouter.sol has revoked autonomous trading authority on-chain.', ...);
```
**❌ `data/protocol.ts:117`:** `agentAddress: '0x136c…D846'` — ini alamat **AgentRouter**, bukan agent.

**✅ Ganti jadi:**
```ts
const [agentAddr, setAgentAddr] = useState<`0x${string}` | ''>('');   // input user
const { data: policy } = useOnChainAgentPolicy(user, agentAddr || undefined); // pakai ABI yang sudah dibetulkan (0.1)
const { data: remaining } = useReadContract({
  address: C.agentRouter, abi: AGENT_ROUTER_ABI, functionName: 'remainingBudget', args: [user!, agentAddr as any],
  query: { enabled: !!agentAddr },
});

async function savePolicy(f: { budget: string; maxPerTrade: string; days: number; canSell: boolean; canShield: boolean; stocks: `0x${string}`[] }) {
  await send({
    address: C.agentRouter, abi: AGENT_ROUTER_ABI, functionName: 'setPolicy',
    args: [agentAddr as `0x${string}`, parseUnits(f.budget, 6), parseUnits(f.maxPerTrade, 6),
           BigInt(Math.floor(Date.now() / 1000) + f.days * 86400), f.canSell, f.canShield, f.stocks],
  }, 'Set agent policy', toast);
}

async function revokeAgent() {
  await send({ address: C.agentRouter, abi: AGENT_ROUTER_ABI, functionName: 'revoke', args: [agentAddr as `0x${string}`] }, 'Revoke agent', toast);
}
```
> `AgentRouter._buy` menarik USDG langsung dari **owner** (`USDG.safeTransferFrom(owner, …)`, `AgentRouter.sol:240`). Jadi setelah `setPolicy`, owner juga harus `approve(agentRouter, budget)`. Tampilkan allowance ini di tab Agents dan minta approve sebesar `budget`, bukan unlimited. Saat revoke, tawarkan juga `approve(agentRouter, 0)`.

```tsx
<input placeholder="Agent address 0x…" value={agentAddr} onChange={(e) => setAgentAddr(e.target.value as any)} />
{policy && policy.agent !== zeroAddress && (
  <>
    <Row label="Budget" value={`${formatUnits(policy.budgetUsdg, 6)} USDG`} />
    <Row label="Spent" value={`${formatUnits(policy.spentUsdg, 6)} USDG`} />
    <Row label="Remaining" value={remaining !== undefined ? `${formatUnits(remaining as bigint, 6)} USDG` : '—'} />
    <Row label="Max per trade" value={`${formatUnits(policy.maxPerTradeUsdg, 6)} USDG`} />
    <Row label="Expires" value={new Date(Number(policy.expiresAt) * 1000).toLocaleString()} />
    <Row label="Status" value={policy.revoked ? 'Revoked' : Number(policy.expiresAt) * 1000 < Date.now() ? 'Expired' : 'Active'} />
    <button disabled={policy.revoked} onClick={revokeAgent}>Revoke</button>
  </>
)}
```
Tidak ada lagi tombol "Restore": setelah revoke, user membuat policy baru lewat `setPolicy`.

---

## 7. Activity (#7)

**❌ Sekarang:** kosong di Live Mode; di Demo memakai `DEMO_ACTIVITIES`.

**➕ `web/src/hooks/chain/useActivity.ts`:**
```ts
import { useAccount, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { parseAbiItem, formatUnits } from 'viem';
import { C } from '../../config/contracts';

const EV = {
  bought:   parseAbiItem('event Bought(bytes32 indexed id, address indexed account, address recipient, uint256 units, uint256 tokens, uint256 usdgPaid, uint256 vMarkWad, uint64 sigmaBps, uint8 session)'),
  sold:     parseAbiItem('event Sold(bytes32 indexed id, address indexed account, address recipient, uint256 units, uint256 tokens, uint256 usdgReceived, uint256 vMarkWad, uint64 sigmaBps, uint8 session)'),
  shield:   parseAbiItem('event ShieldBought(address indexed account, address indexed stock, bytes32 indexed id, uint256 tokenUnits, uint256 usdgPaid)'),
  queued:   parseAbiItem('event WithdrawalQueued(address indexed owner, uint256 indexed ticket, uint256 shares, uint64 claimableAt)'),
  claimed:  parseAbiItem('event WithdrawalClaimed(address indexed owner, uint256 indexed ticket, uint256 usdg)'),
  revoked:  parseAbiItem('event PolicyRevoked(address indexed owner, address indexed agent)'),
};

export function useActivity() {
  const { address: me } = useAccount();
  const client = usePublicClient({ chainId: 46630 });
  return useQuery({
    queryKey: ['activity', me],
    enabled: !!me && !!client,
    refetchInterval: 30_000,
    queryFn: async () => {
      const from = C.deployBlock;
      const [b, s, sh, q, c, r] = await Promise.all([
        client!.getLogs({ address: C.engine, event: EV.bought, args: { account: me }, fromBlock: from }),
        client!.getLogs({ address: C.engine, event: EV.sold, args: { account: me }, fromBlock: from }),
        client!.getLogs({ address: C.engine, event: EV.shield, args: { account: me }, fromBlock: from }),
        client!.getLogs({ address: C.writerPool, event: EV.queued, args: { owner: me }, fromBlock: from }),
        client!.getLogs({ address: C.writerPool, event: EV.claimed, args: { owner: me }, fromBlock: from }),
        client!.getLogs({ address: C.agentRouter, event: EV.revoked, args: { owner: me }, fromBlock: from }),
      ]);
      const rows = [
        ...b.map((l) => ({ kind: 'Buy', usdg: -Number(formatUnits(l.args.usdgPaid!, 6)), l })),
        ...s.map((l) => ({ kind: 'Sell', usdg: Number(formatUnits(l.args.usdgReceived!, 6)), l })),
        ...sh.map((l) => ({ kind: 'Shield', usdg: -Number(formatUnits(l.args.usdgPaid!, 6)), l })),
        ...q.map((l) => ({ kind: 'Withdraw request', usdg: null, l })),
        ...c.map((l) => ({ kind: 'Claim', usdg: Number(formatUnits(l.args.usdg!, 6)), l })),
        ...r.map((l) => ({ kind: 'Agent revoked', usdg: null, l })),
      ];
      return rows
        .sort((x, y) => Number(y.l.blockNumber - x.l.blockNumber))
        .map((x) => ({ kind: x.kind, usdg: x.usdg, block: x.l.blockNumber, tx: x.l.transactionHash }));
    },
  });
}
```
> Deposit pool: baca event `Deposit` (ERC-4626) dari WriterPool kalau ada, atau `Transfer(from=0x0, to=user)` pada token share.

```tsx
{activity?.map((a) => (
  <tr key={a.tx + a.kind}>
    <td>{a.kind}</td>
    <td>{a.usdg == null ? '—' : `${a.usdg > 0 ? '+' : ''}${a.usdg.toFixed(2)} USDG`}</td>
    <td>#{String(a.block)}</td>
    <td><a href={`https://explorer.testnet.chain.robinhood.com/tx/${a.tx}`} target="_blank">View ↗</a></td>
  </tr>
))}
```

---

## 8. Hardcode tersisa (#8)

**`data/protocol.ts:57-93` `change24h`**
```diff
  { symbol: 'NVDA', name: 'NVIDIA', address: '0x98a7…101D',
-   price: 142.50, change24h: 3.42,
  },
```
`types.ts`: jadikan `change24h?: number`. `StockTickerBar.tsx:28-51`: render perubahan hanya kalau ada sumber nyata, kalau tidak, sembunyikan:
```tsx
{stock.change24h != null && <span>{stock.change24h >= 0 ? '+' : ''}{stock.change24h.toFixed(2)}%</span>}
```

**`DashboardPage.tsx:1194` tombol MCP**
```diff
- navigator.clipboard.writeText('npx -y @arcum/mcp');
```
Hapus tombolnya sampai paket benar-benar terbit di npm. Ganti dengan link ke `app/src/mcp/README` dan cara jalankan lokal (`bun run app/src/mcp/server.ts`).

**`INITIAL_POOL_STATS`, `INITIAL_AGENT_POLICY`:** pindahkan ke `demoFixtures.ts`. Di Live Mode, nilai awal = `undefined`, dan UI menampilkan `—` sampai hook baca selesai.

---

## 9. Kontrak: `shieldFor` (#11)

**❌ Sekarang: `contracts/src/AgentRouter.sol:274-296` `_pickShield`**
- Tidak punya fallback "strike terendah" yang dimiliki engine (`ArcumEngine.sol:241-249`). Kalau tidak ada put ≤ target, router revert `SeriesNotBuyable(0)` sementara engine tetap membeli.
- Memakai `readLite`, sementara engine memakai `read`.

Dua salinan logika pasti akan berbeda lagi. **✅ Solusi: satu sumber logika di engine.**

```solidity
// ArcumEngine.sol — pecah pemilihan menjadi fungsi view publik
function pickShield(address stockToken, uint16 strikePctBelowBps) public view returns (bytes32 best) {
    PriceReading memory r = PRICE_GUARD.read(stockToken);
    if (r.s == 0) revert StalePrice();
    uint256 targetStrike = r.s.wadMul(WAD - (uint256(strikePctBelowBps) * WAD / 10000));
    bytes32[] memory ids = shieldList(stockToken);
    uint256 bestK;
    for (uint256 i = 0; i < ids.length; i++) {
        Series memory s = REGISTRY.seriesOf(ids[i]);
        if (s.strike <= targetStrike && s.strike > bestK) { best = ids[i]; bestK = s.strike; }
    }
    if (best == bytes32(0) && ids.length > 0) {
        uint256 lowestK = type(uint256).max;
        for (uint256 i = 0; i < ids.length; i++) {
            Series memory s = REGISTRY.seriesOf(ids[i]);
            if (s.strike < lowestK) { best = ids[i]; lowestK = s.strike; }
        }
    }
    if (best == bytes32(0)) revert UnknownSeries(bytes32(0));
}

function shield(address stockToken, uint128 tokenUnits, uint16 strikePctBelowBps, uint128 maxCostUsdg, uint64 deadline)
    external override returns (bytes32 id, uint256 costUsdg)
{
    if (tokenUnits == 0 || strikePctBelowBps >= 10000) revert BelowMinimum();
    if (stockToken.code.length > 0) {
        uint256 held = IERC20(stockToken).balanceOf(msg.sender);
        if (held < tokenUnits) revert ShieldExceedsHolding(held, tokenUnits);
    }
    id = pickShield(stockToken, strikePctBelowBps);
    (costUsdg,) = _buyInternal(id, tokenUnits, maxCostUsdg, deadline, msg.sender, msg.sender);
    emit ShieldBought(msg.sender, stockToken, id, tokenUnits, costUsdg);
}
```
> Kalau `PRICE_GUARD.read` bukan `view` (cek interface: `read` adalah `view`, `poke` yang tidak), fungsi di atas aman sebagai `view`.

```solidity
// AgentRouter.sol
interface IAgentRouterEngine {
    // ...yang sudah ada...
    function pickShield(address stock, uint16 pctBelowBps) external view returns (bytes32);
}

function shieldFor(...) external nonReentrant returns (bytes32 id, uint256 cost) {
    // ...cek policy, stock, holding seperti sekarang...
-   id = _pickShield(stock, pctBelowBps);
+   id = IAgentRouterEngine(address(ENGINE)).pickShield(stock, pctBelowBps);
    (cost,) = _buy(p, owner, id, tokenUnits, maxCostUsdg, deadline);
    emit AgentTrade(owner, msg.sender, id, true, cost);
}
// hapus _pickShield
```
> **Penting soal deploy:** di `DeployTestnet.s.sol` hanya **WriterPool** yang memakai `ERC1967Proxy`. ArcumEngine (`:87`) dan AgentRouter (`:111`) di-deploy langsung tanpa proxy, walaupun kunci manifest-nya bernama `engineProxy`. Jadi perbaikan ini **wajib deploy ulang engine dan router**, lalu sambungkan ulang semua modul yang menunjuk engine lama:
> - `SeriesRegistry`: set engine baru (fungsi `onlyEngine` di registry).
> - `WriterPool.setModules(...)`: engine baru.
> - Re-list series lewat engine baru kalau listing dilakukan oleh engine.
> - Update `deployments/46630.json`, `web/src/config`, MCP, dan halaman Contracts.
> - Ganti nama kunci `engineProxy` → `engine` supaya tidak menyesatkan.
>
> Posisi option yang sudah dibeli lewat engine lama tetap ada di token series-nya. Kalau registry dan token dipakai ulang, catat apakah engine baru bisa `sell` token lama. Kalau tidak, umumkan reset testnet.

**➕ Tes (tambahkan di `test/AgentRouter.t.sol`):**
```solidity
function test_shieldFor_matchesDirectShield() public {
    // owner memegang stock token, policy canShield = true
    bytes32 expected = engine.pickShield(address(nvda), 500);
    vm.prank(agent);
    (bytes32 id,) = router.shieldFor(owner, address(nvda), 1e18, 500, 100e6, uint64(block.timestamp + 600));
    assertEq(id, expected);
}

function test_shieldFor_fallsBackToLowestStrike_likeEngine() public {
    // pct sangat kecil sehingga tidak ada put ≤ target
    bytes32 expected = engine.pickShield(address(nvda), 1);
    vm.prank(agent);
    (bytes32 id,) = router.shieldFor(owner, address(nvda), 1e18, 1, 100e6, uint64(block.timestamp + 600));
    assertEq(id, expected);
}
```

---

## 10. Fork test asli (#12)

**❌ Sekarang: `contracts/test/fork/Testnet46630.t.sol:64`**
```solidity
engine = new ArcumEngine(...);   // deploy ulang lokal; bukan menguji kontrak di testnet
```
**✅ Ganti jadi:**
```solidity
// contracts/test/fork/Testnet46630.t.sol
pragma solidity ^0.8.24;
import "forge-std/Test.sol";
import {IOptionEngine} from "../../src/interfaces/IOptionEngine.sol";
import {ISeriesRegistry} from "../../src/interfaces/ISeriesRegistry.sol";
import {IPool} from "../../src/interfaces/IPool.sol";
import {IAgentRouter} from "../../src/interfaces/IAgentRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Testnet46630ForkTest is Test {
    IOptionEngine engine; ISeriesRegistry reg; IPool pool; IAgentRouter router; IERC20 usdg;
    address nvda; address user = makeAddr("user"); address agent = makeAddr("agent");

    function setUp() public {
        vm.createSelectFork(vm.envOr("RH_TESTNET_RPC", string("https://rpc.testnet.chain.robinhood.com")));
        string memory j = vm.readFile("deployments/46630.json");
        engine = IOptionEngine(vm.parseJsonAddress(j, ".engineProxy"));
        reg    = ISeriesRegistry(vm.parseJsonAddress(j, ".seriesRegistry"));
        pool   = IPool(vm.parseJsonAddress(j, ".writerPoolProxy"));
        router = IAgentRouter(vm.parseJsonAddress(j, ".agentRouter"));
        usdg   = IERC20(vm.parseJsonAddress(j, ".usdg"));
        nvda   = vm.parseJsonAddress(j, ".nvda");
        deal(address(usdg), user, 10_000e6);
        deal(nvda, user, 100e18);
        // vm.warp ke jam pasar AS kalau PriceGuard memblokir di luar sesi
    }

    function test_buy_sell_roundtrip() public {
        bytes32 id = reg.idOf(nvda, true, 141e18, 86400);
        vm.startPrank(user);
        usdg.approve(address(engine), 1_000e6);
        engine.buy(id, 1e18, 1_000e6, uint64(block.timestamp + 600), user);
        address token = reg.seriesOf(id).token;
        uint256 bal = IERC20(token).balanceOf(user);
        assertGt(bal, 0);
        engine.sell(id, uint128(bal), 0, uint64(block.timestamp + 600), user);
        assertEq(IERC20(token).balanceOf(user), 0);
        vm.stopPrank();
    }

    function test_shield_direct() public { /* approve → engine.shield(nvda, 10e18, 500, 500e6, ...) */ }
    function test_shieldFor_agent() public { /* setPolicy(canShield) → prank agent → router.shieldFor(...) */ }
    function test_pool_deposit_request_claim() public {
        /* deposit → vm.warp(lockSeconds) → requestWithdraw → vm.warp(claimableAt) → claim → assert USDG naik */
    }
    function test_pool_claim_after_window_requeues() public {
        /* request → vm.warp(claimableAt + 7 days + 1) → claim → expectEmit WithdrawalQueued, paid == 0 */
    }
    function test_agent_revoke_blocks_buyFor() public {
        /* setPolicy → revoke → prank agent → expectRevert buyFor */
    }
}
```
Jalankan terpisah: `forge test --match-path test/fork/* -vvv`. Tes lokal biasa tetap jalan tanpa RPC.

---

## 11. Manifest library (#13)

**❌ Sekarang:** `deployments/46630.json` tidak memuat library.

**✅ Tambahkan** (alamat diambil dari `broadcast/<script>/46630/run-latest.json`, bagian `libraries` atau tx `CREATE` library):
```json
{
  "libraries": {
    "Greeks": "0x…",
    "EverlastingMath": "0x…",
    "Funding": "0x…",
    "PoolHedging": "0x…",
    "PoolLayers": "0x…"
  },
  "deployBlock": 0
}
```
```bash
jq -r '.libraries[]' broadcast/DeployTestnet.s.sol/46630/run-latest.json
```
Verifikasi PoolLayers:
```bash
forge verify-contract <ADDR> src/libs/PoolLayers.sol:PoolLayers \
  --chain-id 46630 --verifier blockscout \
  --verifier-url https://explorer.testnet.chain.robinhood.com/api/
```
Tampilkan juga di `ContractsPage.tsx` (dibaca dari manifest, bukan ditulis tangan).

---

## 12. Keeper, indexer, quickstart, MCP (#14)

### 12.1 Keeper

**❌ Sekarang: `app/src/keeper/keeper.ts:43-60`**
```ts
const decayFactor = Math.exp(-ratePerSec * elapsed);
s.norm = s.norm * decayFactor;      // hanya di memori, tidak pernah ke chain
```
**✅ Ganti jadi: `app/src/keeper/run.ts`**
```ts
import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import manifest from '../../../deployments/46630.json';
import { ArcumEngineAbi, SeriesRegistryAbi } from '../abi/generated';

const chain = defineChain({ id: 46630, name: 'RH Testnet', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.RH_TESTNET_RPC!] } } });
const account = privateKeyToAccount(process.env.KEEPER_PRIVATE_KEY as `0x${string}`); // key KHUSUS keeper, bukan deployer
const pub = createPublicClient({ chain, transport: http() });
const wallet = createWalletClient({ chain, account, transport: http() });

const ENGINE = manifest.engineProxy as `0x${string}`;
const REG = manifest.seriesRegistry as `0x${string}`;
const MIN_ELAPSED = 3600n;          // accrue kalau sudah > 1 jam
const BATCH = 20;

async function tick() {
  const n = await pub.readContract({ address: REG, abi: SeriesRegistryAbi, functionName: 'seriesCount' });
  const now = BigInt(Math.floor(Date.now() / 1000));
  const due: `0x${string}`[] = [];
  for (let i = 0n; i < n; i++) {
    const id = await pub.readContract({ address: REG, abi: SeriesRegistryAbi, functionName: 'seriesIdAt', args: [i] });
    const s = await pub.readContract({ address: REG, abi: SeriesRegistryAbi, functionName: 'seriesOf', args: [id] });
    if (!s.archived && now - s.lastAccrual >= MIN_ELAPSED) due.push(id);
  }
  for (let i = 0; i < due.length; i += BATCH) {
    const ids = due.slice(i, i + BATCH);
    try {
      const hash = await wallet.writeContract({ address: ENGINE, abi: ArcumEngineAbi, functionName: 'accrueMany', args: [ids] });
      const r = await pub.waitForTransactionReceipt({ hash });
      console.log(JSON.stringify({ at: new Date().toISOString(), action: 'accrueMany', n: ids.length, tx: hash, status: r.status }));
    } catch (e) {
      console.error(JSON.stringify({ at: new Date().toISOString(), action: 'accrueMany', error: String(e) }));
    }
  }
  // fillQueued: baca event SellQueued yang belum QueuedSellFilled/Cancelled, lalu engine.fillQueued(ticket)
}

tick();
setInterval(tick, 15 * 60 * 1000);
```
Jalankan sebagai cron/worker (Railway/Render sudah ada config di repo). Bukti selesai: tx `accrueMany` dari alamat keeper muncul berkala di Blockscout.

### 12.2 Indexer
**❌ Sekarang: `app/src/indexer/indexer.ts:74`** `this.eventStore.push(...)` (array memori).

**✅ Pilihan testnet yang paling sederhana:** hapus indexer, web membaca log langsung (§7). Kalau API tetap dibutuhkan, minimal:
```ts
// simpan checkpoint blok di file/DB supaya tahan restart
let from = BigInt(loadCheckpoint() ?? manifest.deployBlock);
const to = await pub.getBlockNumber();
const logs = await pub.getLogs({ address: [ENGINE, POOL, ROUTER], fromBlock: from, toBlock: to });
await db.insertMany(logs.map(toRow));            // idempotent: unique (txHash, logIndex)
saveCheckpoint(to + 1n);
```

### 12.3 `scripts/agent_quickstart.ts:99`
**❌ Sekarang:**
```ts
txHash: "0x8f4c2198ab90b34de548810237c54178da8a39178129c54e09f58209841e21b7",
console.log('Policy Status: ACTIVE (Verified on AgentRouter.sol)');
```
**✅ Ganti jadi:**
```ts
const policy = await pub.readContract({ address: ROUTER, abi: AgentRouterAbi, functionName: 'policyOf', args: [owner, agent.address] });
if (policy.revoked || Number(policy.expiresAt) * 1000 < Date.now()) throw new Error('Policy not active');
const id = await pub.readContract({ address: REG, abi: SeriesRegistryAbi, functionName: 'idOf', args: [NVDA, true, 141n * 10n ** 18n, 86400] });
const q = await pub.readContract({ address: ENGINE, abi: ArcumEngineAbi, functionName: 'quote', args: [id, 10n ** 18n, true] });
const hash = await agentWallet.writeContract({
  address: ROUTER, abi: AgentRouterAbi, functionName: 'buyFor',
  args: [owner, id, 10n ** 18n, (q.usdg * 105n) / 100n, BigInt(Math.floor(Date.now() / 1000) + 600)],
});
const r = await pub.waitForTransactionReceipt({ hash });
console.log(`buyFor ${r.status}: https://explorer.testnet.chain.robinhood.com/tx/${hash}`);
```

### 12.4 MCP `app/src/mcp/tools.ts:185-186, 248`
**❌ Sekarang:**
```ts
poolAddress: '0x67fF…B58A',            // pool Lemniscate
settlementAsset: '<USDG mainnet>',
agentRouterAddress: process.env.AGENT_ROUTER ?? '0x…',   // fallback hardcoded
```
**✅ Ganti jadi:**
```ts
import manifest from '../../../deployments/46630.json';
const poolAddress = manifest.writerPoolProxy;
const settlementAsset = manifest.usdg;
const agentRouterAddress = process.env.AGENT_ROUTER ?? manifest.agentRouter;
```

### 12.5 API server `app/src/api/server.ts:41, 110-130`
**❌ Sekarang:** `lastBlock: 18942109`, `navUsdg: 2500000.0`, `aprPct: 18.4`, `price: 142.50`.
**✅ Ganti jadi:** baca kontrak dengan `pub.readContract` (sama seperti §2 dan §5), atau hapus endpoint `/v1/pool` dan `/v1/stocks`. `aprPct` dihapus: tidak ada sumber on-chain.

---

## 13. Rute (#15)

**❌ Sekarang: `web/src/App.tsx`** hanya `/` dan tab dashboard.

**✅ Contoh (react-router v6):**
```tsx
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/trade" element={<DashboardPage tab="trade" />} />
  <Route path="/positions" element={<DashboardPage tab="positions" />} />
  <Route path="/shield" element={<DashboardPage tab="shield" />} />
  <Route path="/pool" element={<DashboardPage tab="pool" />} />
  <Route path="/agents" element={<DashboardPage tab="agents" />} />
  <Route path="/activity" element={<DashboardPage tab="activity" />} />
  <Route path="/protocol" element={<ProtocolPage />} />
  <Route path="/writers" element={<WritersPage />} />
  <Route path="/costs" element={<CostsPage />} />
  <Route path="/markets/:symbol" element={<MarketPage />} />
  <Route path="/learn/*" element={<LearnPage />} />
  <Route path="/docs" element={<DocsPage />} />
  <Route path="/contracts" element={<ContractsPage />} />
  <Route path="/exit" element={<ExitPage />} />
  <Route path="/privacy" element={<PrivacyPage />} />
  <Route path="/product-terms" element={<ProductTermsPage />} />
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```
`vercel.json` sudah punya SPA fallback (commit `acc2e11`); pastikan rute baru tidak 404 saat dibuka langsung.
Isi `/costs` dan `/writers` diambil dari kontrak (fee bps, cap, lock, queue delay), bukan teks tetap.

---

## 14. Teks klaim (L, M, N, P)

| Lokasi | ❌ Sekarang | ✅ Ganti jadi |
|---|---|---|
| `ContractsPage.tsx:68`, `DocsPage.tsx:74` | "48-hour timelock enforcing delayed execution on admin upgrades" | "Testnet owner: EOA. Timelock not deployed yet (mainnet requirement)." |
| `data/protocol.ts:28, 42` | `timelock: '0x0000…0000'` ditampilkan sebagai kontrak | Sembunyikan baris Timelock di Contracts kalau alamatnya nol |
| `DocsPage.tsx:53` | "24-hour deposit lock" | `` `Deposit lock: ${pool.lockMinutes} min (on-chain)` `` dari `lockSeconds()` |
| Pool tab | "72-hour notice" | Queue delay dari kontrak; "Claim window: 7 days, after that the ticket requeues" |
| `DocsPage.tsx:59, 183` | "Uniswap V3 TWAP Anti-Sandwich Protection" sebagai fitur aktif | Pindah ke bagian **"Not active on testnet"** |
| `DocsPage.tsx:66` | "Autonomous AI Agents (MCP & ERC-4337)" | "AI agents via AgentRouter policies. ERC-4337: not active." |
| `HANDOVER_PACKAGE.md:13, 30-31` | "✅ VERIFIED" di chain `4663`, bukti = unit test | Ganti status jadi "Unit test only". Isi ulang setelah E1–E10 dengan tx hash dari UI |
| `scripts/mainnet_dry_run.py`, `scripts/canary_mainnet_fork.py`, `deployments/*_report.json` | Laporan "sukses" tanpa deployment | Hapus, atau tambahkan baris pertama `// SIMULATION ONLY — not deployment evidence` |

---

## 15. Cek akhir

```bash
# 1) tidak ada hardcode/klaim tersisa (hasil harus kosong)
cd web/src
grep -rnE "change24h: [0-9-]|35\.0% NAV|@arcum/mcp|0\.95\)|95\.0% Portfolio|0\.71%|Automated|0x8f4c|48-hour|24-hour|72-hour|Anti-Sandwich|ERC-4337|18942109|2500000|getListedStrikes|computeSeriesId|setPositions\(|setPoolStats\(|setAgentPolicy\(" \
  . ../../app ../../scripts | grep -v demoFixtures

# 2) hook baca benar-benar dipakai (hasil harus TIDAK kosong untuk setiap nama)
for h in useSeriesList usePrices useOnChainQuote usePositions useWithdrawTickets useOnChainAgentPolicy useActivity useTx; do
  echo "$h: $(grep -rl "$h" pages components | wc -l) file"; done

# 3) kontrak
cd ../../contracts && forge test && forge test --match-path "test/fork/*" -vv

# 4) web
cd ../web && npx tsc --noEmit && npm run build
```

Setelah keempat cek bersih, rekam E1–E10 sesuai `UPDATE_ARCUM_14NOV.md` §4, dari `arcumpool.xyz`, dengan **wallet baru**.
