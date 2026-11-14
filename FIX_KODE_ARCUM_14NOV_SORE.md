# Arcum: Perbaikan Kode Sisa (14 Nov 2026, sore)

> **Untuk:** dev Arcum
> **Dasar:** commit `cbc2d24` (14 Nov 14:03)
> **Scope dokumen ini:** perbaikan **kode** saja. Rekaman/bukti E2E menyusul setelah semua ini beres.
> **Perkiraan kerja:** ±1 jam

Status singkat: kontrak 41/41, integrasi web ke chain hampir lengkap, AgentRouter baru sudah dideploy (`0xAB33…ffaa`). Yang tersisa di bawah ini, urut prioritas.

---

## 1. 🔴 Desimal share WriterPool salah (18 → 12)

**Koreksi dari reviewer:** dokumen sebelumnya (`UPDATE_ARCUM_14NOV.md` dan `KODE_PERBAIKAN_ARCUM_14NOV.md`) menulis share WriterPool **18 desimal**. Itu salah. Kedua dokumen sudah dibetulkan.

**Bukti on-chain:**
```
WriterPool.decimals()      = 12
WriterPool.totalSupply()   = 4996601799618041505   → 4.996.601 share (12 desimal)
WriterPool.nav()           = 5001600174745538860351928 → 5.001.600 USDG (WAD, 18 desimal)
WriterPool.navPerShare()   = 1001000354906784737  → 1,001 (WAD, 18 desimal)
Deposit 500 USDG (tx 0x7f5a…a94c) → balanceOf = 499001370914756 → 499 share
```
Jadi: **share = 12 desimal**, `nav` / `navPerShare` / `totalLiability` = 18 desimal (WAD).

**Akibat kode sekarang:**
- Saldo share tampil `0,000499 AWP` padahal 499.
- Request withdraw mengirim `parseUnits(x, 18)` = 1.000.000 × lebih besar dari saldo → **pasti revert**. Writer tidak bisa menarik dana dari UI.

### ❌ Sekarang
`web/src/hooks/chain/useOnChainPool.ts:56, 61`
```ts
totalShares: supply != null ? Number(formatUnits(supply as bigint, 18)) : 0,
...
mySharesFormatted: mySharesRaw != null ? Number(formatUnits(mySharesRaw as bigint, 18)) : 0,
```
`web/src/pages/DashboardPage.tsx:430`
```ts
const sharesRaw = parseUnits(String(withdrawShares), 18);
```
`web/src/pages/DashboardPage.tsx:1342`
```tsx
<td className="p-3.5 font-tabular">{formatUnits(t.shares, 18)} AWP</td>
```

### ✅ Ganti jadi
Buat satu konstanta, jangan tulis angka di banyak tempat:
```ts
// web/src/config/contracts.ts
export const SHARE_DECIMALS = 12;   // WriterPool.decimals() di 46630
export const WAD_DECIMALS = 18;     // nav, navPerShare, totalLiability, vMark, strike
export const USDG_DECIMALS = 6;
```
```ts
// useOnChainPool.ts
import { SHARE_DECIMALS, WAD_DECIMALS } from '../../config/contracts';

navUsdg:           Number(formatUnits(nav as bigint, WAD_DECIMALS)),
navPerShare:       Number(formatUnits(nps as bigint, WAD_DECIMALS)),
totalShares:       Number(formatUnits(supply as bigint, SHARE_DECIMALS)),
liabilityUsdg:     Number(formatUnits(liabData as bigint, WAD_DECIMALS)),
mySharesFormatted: Number(formatUnits(mySharesRaw as bigint, SHARE_DECIMALS)),
```
```ts
// DashboardPage.tsx:430
const sharesRaw = parseUnits(String(withdrawShares), SHARE_DECIMALS);
```
```tsx
// DashboardPage.tsx:1342
<td className="p-3.5 font-tabular">{formatUnits(t.shares, SHARE_DECIMALS)} AWP</td>
```

**Lebih aman (opsional):** baca `decimals()` dari kontrak sekali, lalu pakai hasilnya:
```ts
const { data: shareDecimals = 12 } = useReadContract({
  address: C.writerPool, abi: WRITER_POOL_ABI, functionName: 'decimals',
});
```
(tambahkan `'function decimals() view returns (uint8)'` ke `WRITER_POOL_ABI`)

### Cek selesai
- Wallet `0x04ef…03c1` di tab Pool menampilkan **±499 AWP**, bukan 0,000499.
- Klik **Max** → angka 499,00 → Request Withdraw → wallet popup (tidak gagal di simulasi).
- `grep -rn "Shares.*18)\|shares, 18)\|withdrawShares), 18" web/src` → kosong.

---

## 2. 🔴 MCP mengembalikan tx hash acak (palsu)

### ❌ Sekarang
`app/src/mcp/tools.ts:242-246`
```ts
const pseudoTxHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
return {
  success: true,
  transactionHash: pseudoTxHash,
  status: "SUBMITTED",
  ...
```
Agent yang memakai MCP menerima "success" dengan hash yang **tidak pernah ada di chain**. Ini sama dengan tx palsu `0x8f4c…` yang sudah dihapus dari quickstart.

### ✅ Ganti jadi
Kirim tx sungguhan, atau kembalikan **unsigned tx** untuk ditandatangani agent sendiri. Untuk MCP, pilihan kedua lebih aman (server tidak memegang private key):
```ts
import { encodeFunctionData, parseUnits } from 'viem';
import manifest from '../../../deployments/46630.json';
import { AgentRouterAbi } from '../abi/generated';

// tool: prepare_buy_for
const data = encodeFunctionData({
  abi: AgentRouterAbi,
  functionName: 'buyFor',
  args: [owner, seriesId, unitsWad, maxCostUsdg, BigInt(Math.floor(Date.now() / 1000) + 600)],
});
return {
  success: true,
  status: 'UNSIGNED',
  chainId: 46630,
  tx: { to: manifest.agentRouter, data, value: '0' },
  note: 'Sign and send this transaction with the agent key. No transaction has been submitted yet.',
};
```
Kalau server memang mengirim tx (punya key agent), kembalikan hash **setelah** receipt:
```ts
const hash = await wallet.writeContract({ address: manifest.agentRouter, abi: AgentRouterAbi, functionName: 'buyFor', args: [...] });
const r = await pub.waitForTransactionReceipt({ hash });
return { success: r.status === 'success', transactionHash: hash, status: r.status.toUpperCase(),
         explorer: `https://explorer.testnet.chain.robinhood.com/tx/${hash}` };
```
Juga di baris 249:
```diff
- agentRouterAddress: process.env.AGENT_ROUTER_ADDRESS || "0x136c20bc7c362cA1DD623035c351E1786697D846",
+ agentRouterAddress: process.env.AGENT_ROUTER_ADDRESS || manifest.agentRouter,
```
Sesuaikan `app/test/mcp.test.ts` supaya tidak lagi mengharapkan `transactionHash` acak.

### Cek selesai
`grep -rn "Math.random" app/src` → tidak ada yang membuat tx hash.

---

## 3. 🟠 Alamat AgentRouter lama masih ada

`0x136c…D846` adalah router **lama** (bug `shieldFor`). Router aktif: `0xAB3379ca486c7365C693FB6263B021759F45ffaa`.

### ❌ Sekarang
`web/src/config/wagmi.ts:70`
```ts
agentRouter: '0x136c20bc7c362cA1DD623035c351E1786697D846' as const,
```
`ARCUM_TESTNET_CONTRACTS` masih dipakai oleh `TestnetFaucetModal.tsx`, `useOnChainTrade.ts` dan `hooks/chain/usePrice.ts`.

### ✅ Ganti jadi
Satu sumber alamat saja. `ARCUM_TESTNET_CONTRACTS` diisi dari `C` (manifest):
```ts
// web/src/config/wagmi.ts
import { C } from './contracts';
export const ARCUM_TESTNET_CONTRACTS = { chainId: 46630, ...C } as const;
```
Atau lebih bersih: ganti ketiga file di atas supaya import `C` langsung, lalu hapus `ARCUM_TESTNET_CONTRACTS`.

Sama untuk `TESTNET_CONTRACT_ADDRESSES` di `data/protocol.ts`: kalau masih dipakai untuk menulis tx, ganti ke `C`.

### Cek selesai
```bash
grep -rn "0x136c20bc" web app scripts deployments   # → kosong
```

---

## 4. 🟠 Angka cadangan di `useOnChainPool`

### ❌ Sekarang
`web/src/hooks/chain/useOnChainPool.ts:54-60`
```ts
navUsdg:     nav != null ? ... : 0,
navPerShare: nps != null ? ... : 1.0,
riskCapPct:  capBps != null ? Number(capBps) / 100 : 35.0,   // H10 balik lagi lewat fallback
lockMinutes: lockSec != null ? Number(lockSec) / 60 : 30,
```
Kalau satu panggilan gagal, UI menampilkan 35% / 30 menit / NAV/share 1,0 seolah-olah data asli.

### ✅ Ganti jadi
```ts
navUsdg:     nav    != null ? Number(formatUnits(nav as bigint, WAD_DECIMALS)) : null,
navPerShare: nps    != null ? Number(formatUnits(nps as bigint, WAD_DECIMALS)) : null,
riskCapPct:  capBps != null ? Number(capBps) / 100 : null,
lockMinutes: lockSec != null ? Number(lockSec) / 60 : null,
```
Ubah tipe `OnChainPoolData` jadi `number | null`, dan di UI:
```tsx
{pool.riskCapPct == null ? '—' : `${pool.riskCapPct.toFixed(1)}% NAV`}
```

---

## 5. 🟠 Evidence berisi hash yang tidak ada di chain

Dicek langsung ke RPC 46630 (`eth_getTransactionByHash`):

| Di `docs/TESTNET_E2E_EVIDENCE.md` | Hasil |
|---|---|
| Sell `0xc4108846c4f3f01f80214a1a5b82136e05ad986161427cbbcd6f7b1565311a55` | **Tidak ada di chain** |
| Shield `0x5ecc132bc2835f5247c43c1b6d19488a03498b3f886f4cf96bb339da33e9c5b0` | **Tidak ada di chain** |
| Buy `0xa810…8668` | Ada, tapi dari wallet **deployer** `0x1B4F…3e45` (13 Nov, via script), bukan wallet baru |

### ✅ Langkah
- Hapus dua hash yang tidak ada.
- Pindahkan Buy `0xa810…` ke bagian "tx dari script (bukan bukti UI)".
- Ubah status #16 kembali ke 🟡 sampai rekaman E2E dikerjakan.

Aturan ke depan: **setiap hash di evidence harus bisa dibuka di Blockscout**. Reviewer mengecek semua hash satu per satu.

---

## 6. 🟢 Rapikan

| Item | Langkah |
|---|---|
| `LAPORAN_REVISI_ARCUM_14NOV.pdf` (root dan `docs/`) | Hapus klaim "100% LULUS AUDIT" dan "Pengesahan Dewan BMAD" (persona AI, bukan reviewer). Atau hapus PDF-nya; `docs/TESTNET_E2E_EVIDENCE.md` sudah cukup |
| `audit-arcum.md`, `audit_arcum.md`, `update_14/` di repo | Hapus. Dokumen aktif dikirim terpisah oleh reviewer |
| Kunci manifest `engineProxy` | Engine bukan proxy. Ganti nama jadi `engine` (update `config/contracts.ts`, fork test, MCP) |

---

## 7. Cek akhir sebelum lapor

```bash
# 1) kontrak
cd contracts && forge test

# 2) web
cd ../web && npx tsc --noEmit && npm run build

# 3) tidak ada sisa (semua harus kosong)
cd ..
grep -rn "0x136c20bc" web app scripts deployments
grep -rn "shares, 18)\|Shares.*, 18)\|withdrawShares), 18" web/src
grep -rn "Math.random" app/src | grep -i "hash"
grep -rn ": 35.0\|: 30,$\|: 1.0,$" web/src/hooks/chain/useOnChainPool.ts
```

Lalu buka `arcumpool.xyz/pool` dengan wallet `0x04ef…03c1`: saldo harus **±499 AWP**, dan tombol Request Withdraw dengan nilai Max harus memunculkan popup wallet tanpa error simulasi.

**Laporan berikutnya:** commit hash + nomor item (1–6) yang selesai. Bukti E2E (rekaman Buy/Sell/Shield di jam pasar AS, 20:30–03:00 WIB) dikerjakan setelah dokumen ini beres.
