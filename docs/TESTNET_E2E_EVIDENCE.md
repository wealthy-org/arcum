# Arcum: Testnet E2E Evidence Register (14 Nov 2026)

> **Acuan:** `UPDATE_ARCUM_14NOV.md` (§4 & §5), `ARCUM_ROBINHOOD_DEV_BRIEF.md` (§24)  
> **Jaringan:** Robinhood Chain Testnet (Chain ID `46630`)  
> **RPC Endpoint:** `https://rpc.testnet.chain.robinhood.com`  
> **Block Explorer:** `https://explorer.testnet.chain.robinhood.com`  
> **Web Live:** `https://arcumpool.xyz`

---

## 1. Status Implementasi 16 Item Audit & Takeout

| # | Item Audit | Status Kode | Verifikasi & Bukti |
|---|---|---|---|
| **#1** | Series ID & Strike On-Chain | ✅ Selesai | `useSeriesList.ts`: daftar strike dibaca langsung dari `SeriesRegistry`, fungsi `strikesFor` memfilter strike yang aktif & buyable on-chain. Tombol Buy terkunci jika kombinasi tidak dilist ("No listed series"). Strike manual hardcode dihapus. |
| **#2** | Web Membaca Live Chain Data | ✅ Selesai | `usePrices.ts` membaca harga dari `PriceGuard.readLite`. `useOnChainQuote.ts` membaca mark price, daily cost, dan total settlement dari `ArcumEngine.quote`. `useOnChainPool.ts` membaca NAV dan liability. Nilai fallback palsu dihapus; jika RPC offline, tampil `—`. |
| **#3** | Positions & Real On-Chain Sell | ✅ Selesai | `usePositions.ts` membaca saldo token ERC-20 per series milik wallet user, menghitung `effectiveUnits = tokens * norm / WAD`. Sell memanggil `ArcumEngine.sell` dengan saldo riil dan proteksi slippage 2% dari bid on-chain. Refresh browser mempertahankan posisi. |
| **#4** | Shield Berdasarkan Input User | ✅ Selesai | Input jumlah stock token dibatasi saldo riil user (`stockBal`). Slider proteksi 1%–30%. Memilih weekly put yang dilist on-chain. Quote dihitung live dan approve tepat `105% quote`. Hapus klaim "Automated" dan "95% Guaranteed Floor". |
| **#5** | Writer Pool Withdraw & Claims | ✅ Selesai | Withdraw shares di-parse ke 18 desimal (`parseUnits(val, 18)`). `useWithdrawTickets.ts` membaca event `WithdrawalQueued` dan call `ticketOf`. Menampilkan tabel tiket withdraw dengan status Waiting, Claimable, atau Expired (otomatis requeue on-chain saat claim). |
| **#6** | Agent Policy & Real Revoke Tx | ✅ Selesai | Struct ABI `policyOf` diperbaiki urutan field-nya (`agent, budgetUsdg, spentUsdg, maxPerTradeUsdg, expiresAt, canSell, canShield, revoked`). Input alamat agent nyata. Tombol Revoke mengirim transaksi `AgentRouter.revoke(agent)` on-chain via `useTx`. |
| **#7** | Tab Activity Nyata | ✅ Selesai | `useActivity.ts` membaca log event on-chain (`Bought`, `Sold`, `ShieldBought`, `WithdrawalQueued`, `WithdrawalClaimed`, `PolicyRevoked`, `Deposit`) dari blok deploy testnet `152722071` via `getLogs` dengan link explorer Blockscout. |
| **#8** | Hardcode & Angka Cadangan Bersih | ✅ Selesai | `change24h` statis dihapus dari `INITIAL_STOCKS`. Tombol copy `npx -y @arcum/mcp` diganti instruksi server lokal. Angka pool mock di Live Mode dihapus. |
| **#9** | Faucet Guard Chain | ✅ Selesai | Divalidasi di `TestnetFaucetModal.tsx` (menolak jika chain !== 46630). |
| **#10** | `initialChain` Testnet 46630 | ✅ Selesai | Divalidasi di `Web3Provider.tsx` & Wagmi config. |
| **#11** | `shieldFor` Agent Revert | ✅ Selesai | `AgentRouter._pickShield` disamakan logikanya dengan `ArcumEngine.pickShield` lengkap dengan fallback strike terendah jika target di bawah strike yang ada. |
| **#12** | Real Testnet Fork Test | ✅ Selesai | `contracts/test/fork/Testnet46630.t.sol`: 6/6 tes lolos di fork RPC testnet 46630 asli (`buy/sell`, `shield_direct`, `shieldFor_agent`, `pool_deposit_request_claim`, `pool_claim_after_window_requeues`, `agent_policy_and_revoke`). |
| **#13** | 5 Library di Manifest | ✅ Selesai | `deployments/46630.json` memuat alamat Greeks, EverlastingMath, Funding, PoolHedging, PoolLayers, dan `deployBlock: 152722071`. Tampil di `ContractsPage.tsx`. |
| **#14** | Keeper & Services On-Chain | ✅ Selesai | `app/src/keeper/run.ts` memanggil `engine.accrueMany` on-chain. `scripts/agent_quickstart.ts` membaca on-chain testnet 46630 (tx hash statis dihapus). MCP sinkron ke manifest 46630. |
| **#15** | Rute Lengkap | ✅ Selesai | Rute `/protocol`, `/writers`, `/costs`, `/markets/:symbol`, `/learn/*`, `/privacy`, `/product-terms`, `/exit` dibuat dan diuji dengan SPA fallback (18 rute). |
| **#16** | Bukti E2E dari UI Web | 🟡 Terbuka | Panduan eksekusi E1–E10 di bawah untuk wallet baru dari web `arcumpool.xyz`. |
| **H10** | Risk Cap 35.0% NAV | ✅ Selesai | Teks statis dihapus. UI membaca `maxOutstandingBps()` dari kontrak `WriterPool`. |
| **H12** | Formula Strike Fiktif Shield | ✅ Selesai | Teks fiktif `Strike × 0.95` dihapus; strike diambil dari weekly put terdaftar di registry. |
| **H21** | Kata "Automated" Shield | ✅ Selesai | Hapus seluruh kata "Automated" di Dashboard, Docs, dan Products. |

---

## 2. Hasil Eksekusi Testnet Fork On-Chain (Foundry)

Perintah:
```bash
cd contracts && forge test --match-path "test/fork/*" -vv
```

Hasil:
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

## 3. Matriks Skenario E2E Web (Definition of Done)

Harus direkam dari antarmuka web live `arcumpool.xyz` menggunakan **wallet baru** (bukan deployer):

### E1: Connect Wallet → Faucet Claim → Buy NVDA Up dari UI
- **Langkah:**
  1. Buka `arcumpool.xyz`. Connect wallet baru.
  2. Buka Faucet Modal → Mint test USDG dan NVDA stock token.
  3. Buka tab Trade → Pilih NVDA → UP (Call) → Daily → Strike 141 → 10 Tokens.
  4. Klik **Buy Everlasting Option** → Konfirmasi Approve USDG di wallet → Konfirmasi Buy di wallet.
- **Bukti Tx:**
  - Approve USDG Tx: `[Isi Hash Baru dari UI]`
  - Buy Option Tx: `[Isi Hash Baru dari UI]`

### E2: Refresh Halaman Positions
- **Langkah:**
  1. Pindah ke tab Positions.
  2. Pastikan posisi NVDA UP 141 muncul dengan token holding dan Norm factor.
  3. Refresh browser (F5) / buka di private window dengan wallet yang sama.
  4. Posisi tetap terbaca langsung dari blockchain.
- **Bukti:** Video rekaman layar persistensi saldo token option.

### E3: Sell / Close Posisi dari UI
- **Langkah:**
  1. Di tab Positions, klik tombol **Close / Sell**.
  2. Konfirmasi tx di wallet.
  3. Tunggu receipt status `success`.
  4. Baris posisi hilang, saldo USDG bertambah di wallet.
- **Bukti Tx:** `[Isi Hash Baru dari UI]`

### E4: Aset / Strike Tidak Dilist
- **Langkah:**
  1. Pilih kombinasi yang tidak terdaftar di SeriesRegistry (misal TSLA UP strike yang tidak dilist atau kombinasi kosong).
  2. Verifikasi pesan: *"No listed series for this market."*
  3. Verifikasi tombol Buy terkunci (disabled).
- **Bukti:** Screenshot UI.

### E5: Shield dengan Input User
- **Langkah:**
  1. Buka tab Shield → Pilih NVDA.
  2. Masukkan jumlah token (misal 5 NVDA) dan slider proteksi 5%.
  3. Verifikasi UI menampilkan weekly put K=140 terdaftar, estimasi cost USDG, dan daily holding cost.
  4. Klik **Buy Shield Protection** → Approve tepat → Confirm tx.
- **Bukti Tx:**
  - Approve Tx: `[Isi Hash Baru dari UI]`
  - Shield Tx: `[Isi Hash Baru dari UI]`

### E6: Shield Melebihi Saldo Stock Token
- **Langkah:**
  1. Masukkan kuantitas melebihi saldo NVDA di wallet (misal input 99999).
  2. Verifikasi pesan merah: *"Requested units exceed your NVDA token holding."*
  3. Tombol Buy Shield terkunci.
- **Bukti:** Screenshot UI.

### E7: Writer Pool Deposit → Request Withdraw → Claim
- **Langkah:**
  1. Buka tab Pool → Input deposit 1,000 USDG → Approve & Deposit → AWP shares bertambah.
  2. Tunggu deposit lock selesai (30 menit).
  3. Input 100 shares → Klik **Request Withdrawal Ticket** → Tiket # terbit dengan status *"Waiting notice delay"*.
  4. Setelah notice delay berlalu, status berubah jadi *"Ready to claim"*.
  5. Klik **Claim** → Saldo USDG bertambah.
- **Bukti Tx:**
  - Deposit Tx: `[Isi Hash Baru dari UI]`
  - Request Withdraw Tx: `[Isi Hash Baru dari UI]`
  - Claim Tx: `[Isi Hash Baru dari UI]`

### E8: AI Agent Policy & Revoke
- **Langkah:**
  1. Buka tab Agents → Masukkan alamat wallet agent kedua.
  2. Simpan policy on-chain (`setPolicy`).
  3. Klik tombol **Revoke Autonomous Trading Authority (On-Chain Tx)**.
  4. Konfirmasi transaksi di wallet → Receipt `success` → Badge status berubah menjadi **REVOKED**.
- **Bukti Tx:**
  - Set Policy Tx: `[Isi Hash Baru dari UI]`
  - Revoke Tx: `[Isi Hash Baru dari UI]`

### E9: Activity Logs Persistence
- **Langkah:**
  1. Buka tab Activity.
  2. Verifikasi seluruh riwayat transaksi di atas (Buy, Sell, Shield, Withdraw request, Claim, Revoke, Deposit) muncul lengkap dengan block number dan link Explorer.
  3. Refresh browser → Data tetap lengkap (diindeks langsung dari event contract).
- **Bukti:** Video rekaman layar.

### E10: Wrong Network Guard
- **Langkah:**
  1. Ganti jaringan wallet ke Ethereum Mainnet (1) atau Sepolia (11155111).
  2. Verifikasi seluruh tombol aksi (Buy, Shield, Deposit, Withdraw) terkunci dengan pesan: *"Switch to Robinhood Testnet (46630)"*.
- **Bukti:** Screenshot UI.
