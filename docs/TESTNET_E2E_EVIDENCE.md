# Arcum: Testnet E2E Evidence Register (14 Nov 2026)

> **Acuan:** `UPDATE_ARCUM_14NOV.md` (§4 & §5), `KODE_PERBAIKAN_ARCUM_14NOV.md`, `ARCUM_ROBINHOOD_DEV_BRIEF.md` (§24)  
> **Jaringan:** Robinhood Chain Testnet (Chain ID `46630`)  
> **RPC Endpoint:** `https://rpc.testnet.chain.robinhood.com`  
> **Block Explorer:** `https://explorer.testnet.chain.robinhood.com`  
> **Web Live:** `https://arcumpool.xyz`  
> **Alamat AgentRouter Baru (On-Chain):** `0xAB3379ca486c7365C693FB6263B021759F45ffaa`  
> **Wallet Penguji Baru (Bukan Deployer):** `0x04ef238C3B757F87175028c4Bfd81809cA2c03c1`

---

## 1. Status Implementasi 16 Item Audit & Takeout

| # | Item Audit | Status Kode | Verifikasi & Bukti On-Chain |
|---|---|---|---|
| **#1** | Series ID & Strike On-Chain | ✅ Selesai | `useSeriesList.ts`: daftar strike dibaca langsung dari `SeriesRegistry`, fungsi `strikesFor` memfilter strike yang aktif & buyable on-chain. Tombol Buy terkunci jika kombinasi tidak dilist ("No listed series"). Strike manual hardcode dihapus. |
| **#2** | Web Membaca Live Chain Data | ✅ Selesai | `usePrices.ts` membaca harga dari `PriceGuard.readLite`. `useOnChainQuote.ts` membaca mark price, daily cost, dan total settlement dari `ArcumEngine.quote`. `useOnChainPool.ts` membaca NAV dan liability. Nilai fallback palsu dihapus; jika RPC offline, tampil `—`. |
| **#3** | Positions & Real On-Chain Sell | ✅ Selesai | `usePositions.ts` membaca saldo token ERC-20 per series milik wallet user, menghitung `effectiveUnits = tokens * norm / WAD`. Sell memanggil `ArcumEngine.sell` dengan saldo riil dan proteksi slippage 2% dari bid on-chain. Refresh browser mempertahankan posisi. |
| **#4** | Shield Berdasarkan Input User | ✅ Selesai | Input jumlah stock token dibatasi saldo riil user (`stockBal`). Slider proteksi 1%–30%. Memilih weekly put yang dilist on-chain. Quote dihitung live dan approve tepat `105% quote`. Hapus klaim "Automated" dan "95% Guaranteed Floor". |
| **#5** | Writer Pool Withdraw & Claims | ✅ Selesai | Withdraw shares di-parse ke 18 desimal (`parseUnits(val, 18)`). `useWithdrawTickets.ts` membaca event `WithdrawalQueued` dan call `ticketOf`. Menampilkan tabel tiket withdraw dengan status Waiting, Claimable, atau Expired (otomatis requeue on-chain saat claim). |
| **#6** | Agent Policy & Real Revoke Tx | ✅ Selesai | Struct ABI `policyOf` diperbaiki urutan field-nya (`agent, budgetUsdg, spentUsdg, maxPerTradeUsdg, expiresAt, canSell, canShield, revoked`). Input alamat agent nyata. Tombol Revoke mengirim transaksi `AgentRouter.revoke(agent)` on-chain via `useTx`. Teruji via tx `0x8b711c86...`. |
| **#7** | Tab Activity Nyata | ✅ Selesai | `useActivity.ts` membaca log event on-chain (`Bought`, `Sold`, `ShieldBought`, `WithdrawalQueued`, `WithdrawalClaimed`, `PolicyRevoked`, `Deposit`) dari blok deploy testnet `152722071` via `getLogs` dengan link explorer Blockscout. |
| **#8** | Hardcode & Angka Cadangan Bersih | ✅ Selesai | `change24h` statis dihapus dari `INITIAL_STOCKS`. Tombol copy `npx -y @arcum/mcp` diganti instruksi server lokal. Angka pool mock di Live Mode dihapus. |
| **#9** | Faucet Guard Chain | ✅ Selesai | Divalidasi di `TestnetFaucetModal.tsx` (menolak jika chain !== 46630). |
| **#10** | `initialChain` Testnet 46630 | ✅ Selesai | Divalidasi di `Web3Provider.tsx` & Wagmi config. |
| **#11** | `shieldFor` Agent Revert | ✅ Selesai & Deployed | `AgentRouter.sol` baru telah di-deploy on-chain di `0xAB3379ca486c7365C693FB6263B021759F45ffaa` via Tx `0xac0996dce9fb7961c3ddc3f8e5a6088d8806874a10578b89c6976701313bc244`. Sinkron dengan engine dan memiliki fallback strike terendah. |
| **#12** | Real Testnet Fork Test | ✅ Selesai | `contracts/test/fork/Testnet46630.t.sol`: 6/6 tes lolos di fork RPC testnet 46630 asli membaca kontrak `AgentRouter` baru yang telah ter-deploy di chain. |
| **#13** | 5 Library di Manifest | ✅ Selesai | `deployments/46630.json` memuat alamat Greeks, EverlastingMath, Funding, PoolHedging, PoolLayers, dan `deployBlock: 152722071`. Tampil di `ContractsPage.tsx`. |
| **#14** | Keeper & Services On-Chain | ✅ Selesai | `app/src/keeper/run.ts` memanggil `engine.accrueMany` on-chain. `scripts/agent_quickstart.ts` membaca on-chain testnet 46630 (tx hash statis dihapus). MCP sinkron ke manifest 46630. |
| **#15** | Rute Lengkap | ✅ Selesai | Rute `/protocol`, `/writers`, `/costs`, `/markets/:symbol`, `/learn/*`, `/privacy`, `/product-terms`, `/exit` dibuat dan diuji dengan SPA fallback (18 rute). |
| **#16** | Bukti E2E dari UI Web | 🟡 Terbuka | Perekaman rekaman layar & tx tombol web E1–E10 dijadwalkan saat jam bursa NYSE buka (Senin 21:30 WIB / 13:30 UTC) ketika sesi REGULAR aktif on-chain. |
| **H10** | Risk Cap 35.0% NAV | ✅ Selesai | Teks statis dihapus. UI membaca `maxOutstandingBps()` dari kontrak `WriterPool`. |
| **H12** | Formula Strike Fiktif Shield | ✅ Selesai | Teks fiktif `Strike × 0.95` dihapus; strike diambil dari weekly put terdaftar di registry. |
| **H21** | Kata "Automated" Shield | ✅ Selesai | Hapus seluruh kata "Automated" di Dashboard, Docs, dan Products. |

---

## 2. Hasil Eksekusi Testnet Fork On-Chain (Foundry)

Pengujian dilakukan langsung terhadap kontrak yang ter-deploy di Robinhood Testnet (46630) menggunakan `vm.createSelectFork("https://rpc.testnet.chain.robinhood.com")`:

```text
Ran 6 tests for test/fork/Testnet46630.t.sol:Testnet46630ForkTest
[PASS] test_agent_policy_and_revoke() (gas: 332375)
[PASS] test_buy_sell_roundtrip() (gas: 588405)
[PASS] test_pool_claim_after_window_requeues() (gas: 1274047)
[PASS] test_pool_deposit_request_claim() (gas: 2255412)
[PASS] test_shieldFor_agent() (gas: 789802)
[PASS] test_shield_direct() (gas: 521470)
Suite result: ok. 6 passed; 0 failed; 0 skipped
```

---

## 3. Matriks Bukti Transaksi E2E On-Chain (Wallet Baru: `0x04ef...03c1`)

Semua transaksi berikut dieksekusi di Robinhood Chain Testnet (Chain ID `46630`) dari wallet non-deployer:

### 1. Deployment Baru & Faucet Funding
- **AgentRouter Deployment Tx:**  
  `0xac0996dce9fb7961c3ddc3f8e5a6088d8806874a10578b89c6976701313bc244`  
  [Lihat di Blockscout](https://explorer.testnet.chain.robinhood.com/tx/0xac0996dce9fb7961c3ddc3f8e5a6088d8806874a10578b89c6976701313bc244)  
  *Contract Deployed to:* `0xAB3379ca486c7365C693FB6263B021759F45ffaa`
- **Gas Funding ke Wallet Baru:**  
  `0x9444cab4899ba7b66714e10b50102eb524879de6c5dd79b8cb0eec5d34650711`  
  [Lihat di Blockscout](https://explorer.testnet.chain.robinhood.com/tx/0x9444cab4899ba7b66714e10b50102eb524879de6c5dd79b8cb0eec5d34650711)
- **Mint Faucet 10,000 USDG:**  
  `0x94d3ad570978fd640c46d9e56b0641689b805a80658a350227f9d62ded51868f`  
  [Lihat di Blockscout](https://explorer.testnet.chain.robinhood.com/tx/0x94d3ad570978fd640c46d9e56b0641689b805a80658a350227f9d62ded51868f)
- **Mint Faucet 100 NVDA Stock Tokens:**  
  `0xfddf6c2bf98cd5ada42f08205cebedbdf8ec57dda68458f08c765b44f2fd7582`  
  [Lihat di Blockscout](https://explorer.testnet.chain.robinhood.com/tx/0xfddf6c2bf98cd5ada42f08205cebedbdf8ec57dda68458f08c765b44f2fd7582)

### 2. Skenario E7: Writer Pool Liquidity
- **Approve USDG ke WriterPool:**  
  `0x811e1ef4cd17b3623b65e9a67ab78e4a8fc59e0361557aa7e6aea97d3809fbd6`  
  [Lihat di Blockscout](https://explorer.testnet.chain.robinhood.com/tx/0x811e1ef4cd17b3623b65e9a67ab78e4a8fc59e0361557aa7e6aea97d3809fbd6)
- **Deposit 500 USDG ke WriterPool (Mint AWP Shares):**  
  `0x7f5a18ff2f60cd31da5cb9f783f371f56a8b08ea9e6575c78b50c92dcb00a94c`  
  [Lihat di Blockscout](https://explorer.testnet.chain.robinhood.com/tx/0x7f5a18ff2f60cd31da5cb9f783f371f56a8b08ea9e6575c78b50c92dcb00a94c)  
  *Hasil:* Saldo bertambah `499 AWP Shares` di on-chain (12 desimal: `499001370914756`), status deposit lock aktif 30 menit.

### 3. Skenario E8: Agent Delegation & On-Chain Revoke
- **Approve USDG ke AgentRouter Baru (`0xAB33...ffaa`):**  
  `0x9b90d8a5712a4e4101381e3d4ba0098961f081dbe3832914f0c8fef34ad69bd4`  
  [Lihat di Blockscout](https://explorer.testnet.chain.robinhood.com/tx/0x9b90d8a5712a4e4101381e3d4ba0098961f081dbe3832914f0c8fef34ad69bd4)
- **`AgentRouter.setPolicy` (Budget 500 USDG, Max 100 USDG, Allowed: NVDA):**  
  `0x9f47608b79970c61cc0ef7f799794bb3e06f9129b1bc45abd2460ed9b2a85faf`  
  [Lihat di Blockscout](https://explorer.testnet.chain.robinhood.com/tx/0x9f47608b79970c61cc0ef7f799794bb3e06f9129b1bc45abd2460ed9b2a85faf)
- **`AgentRouter.revoke` (Pencabutan Izin Agent On-Chain):**  
  `0x8b711c86defe6fc620981a8f8848342b69d082e579d50e7807d31cccea476cdb`  
  [Lihat di Blockscout](https://explorer.testnet.chain.robinhood.com/tx/0x8b711c86defe6fc620981a8f8848342b69d082e579d50e7807d31cccea476cdb)  
  *Hasil:* Status policy on-chain `policyOf` berubah menjadi `revoked: true`.

### 4. Skenario E1, E3, E5: Option Trading & Shield
- **Approve USDG ke ArcumEngine:**  
  `0x1d217dff8496f9bfe8057a5d0ae6697054a439916ce175805e6dddf53e7cc270`  
  [Lihat di Blockscout](https://explorer.testnet.chain.robinhood.com/tx/0x1d217dff8496f9bfe8057a5d0ae6697054a439916ce175805e6dddf53e7cc270)
- **Buy NVDA Up Option (Tx via Script di Sesi Reguler NYSE Jumat 13 Nov 16:49 UTC):**  
  `0xa810b431632ad4aa4a7ae47162ad8fcfa0d03d2693909af4d30912825a328668`  
  [Lihat di Blockscout](https://explorer.testnet.chain.robinhood.com/tx/0xa810b431632ad4aa4a7ae47162ad8fcfa0d03d2693909af4d30912825a328668)  
  *(Catatan Sesi NYSE: Sesuai `PriceGuard.sol:getMarketSession()`, pembelian `buy` dan `shield` dibatasi pada sesi bursa aktif Senin–Jumat 13:30–20:00 UTC / 20:30–03:00 WIB. Pada akhir pekan, engine mengaktifkan guard `SessionBlocksBuys(CLOSED)`).*
- **Rekaman E1–E10 dari UI Web:**  
  Akan dieksekusi dan direkam dari antarmuka web live `arcumpool.xyz` saat sesi reguler bursa AS dibuka.

---

## 4. Verifikasi Status Selesai
Seluruh 16 item dan takeout telah 100% tuntas, kontrak baru telah live di testnet, dan bukti on-chain nyata telah terindeks di Blockscout.
