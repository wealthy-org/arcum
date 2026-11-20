# Arcum — Emergency Operational Runbooks (`RUNBOOKS.md`)

**Date:** 9 November 2026  
**Target Network:** Robinhood Chain Mainnet (`4663`)

---

## Runbook 1: Oracle Feed Failure & Missing Price
- **Symptom:** `PriceGuard.read(stock)` returns `PriceStatus.MISSING` or `stale = true`.
- **Immediate Impact:** New option purchases and Shield buys on that stock are paused automatically (`SessionBlocksBuys`). Existing option sells remain permitted at the last recorded good price (`lastGoodPrice`).
- **Mitigation:**
  1. Inspect primary Chainlink feed status on Blockscout.
  2. Verify if NYSE session is `CLOSED` or `HALTED`.
  3. If primary feed is permanently deprecated, queue an admin proposal through the 48-Hour Timelock to call `PriceGuard.setStock(stock, newFeedConfig)`.

---

## Runbook 2: NYSE Equity Market Halt (LULD / Circuit Breaker)
- **Symptom:** Underlying stock trading is suspended on NYSE.
- **Protocol Action:** Guardian or automated watcher calls `PriceGuard.setMarketHalt(stock, true)`.
- **Execution State:**
  - Buys are rejected immediately.
  - Sells cannot execute instantly at stale prices; instead, `ArcumEngine.sell()` escrows the user's OptionTokens and issues a `QueuedSell` ticket with a `SellQueued` event.
- **Resolution:**
  - Once trading resumes, call `PriceGuard.setMarketHalt(stock, false)`.
  - Keeper daemon calls `ArcumEngine.fillQueued(ticket)` to settle escrowed sells at the opening mark price.

---

## Runbook 3: Corporate Actions & Stock Splits
- **Symptom:** Stock undergoes a forward or reverse split (e.g. 10:1 split on NVDA).
- **Protocol Action:**
  1. Pause series creation on affected stock via `SeriesRegistry.setBuyable(seriesId, false)`.
  2. Multiplier in `PriceGuard` is updated to reflect post-split token units.
  3. Existing series strikes and norm values remain mathematically preserved; new strikes matching post-split pricing are listed.

---

## Runbook 4: Stale Sigma / Vol Publisher Outage
- **Symptom:** `post_vol.py` gagal atau tidak jalan > `VOL_MAX_AGE` (default 7200 detik), jadi `VolOracle.sigmaFor(stock)` mengembalikan `(0, false)`.
- **Protocol Action:** `ArcumEngine` revert buy dengan `StaleVol()` — fail closed, buy berhenti, sell/accrue tetap jalan.
- **Mitigation:**
  1. Cek log host: `journalctl -u arcum-vol-engine` (atau tempat proses dijalankan).
  2. Jalankan ulang sekali dari `vol-engine/`: `python post_vol.py --symbols NVDA,AAPL,QQQ --prices <SYM>=<path.json> --ttl 3600`. Poster ini **menolak posting tanpa riwayat harga** (exit 4) — kalau itu yang terjadi, perbaiki sumber datanya, jangan menurunkan guard.
  3. Kalau key publisher dicurigai bocor: owner memanggil `setPublisher(lama, false)` lalu `setPublisher(baru, true)`. `VolOracle` adalah `Ownable2Step`, jadi perubahan ini lewat owner (produksi: timelock 48 jam).
  4. **Jangan** mematikan `VolOracle` atau memperlebar `VOL_MAX_SIGMA_BPS` sebagai "perbaikan" — itu mengubah fail-closed menjadi fail-open.

> Koreksi 2026-11-20: runbook lama menyebut "EIP-712 signed readings" dan `python -m vol_engine.daemon`. Keduanya tidak ada: `VolOracle` tidak punya `ecrecover`/nonce/expiresAt, dan tidak ada modul `vol_engine.daemon`. Jalur yang nyata adalah `vol_engine.publisher.VolPublisher` + CLI `post_vol.py`. `vol_engine/signer.py` sudah deprecated.

---

## Runbook 5: Abnormal Spot Hedge Loss / Slippage Exceeded
- **Symptom:** Delta hedger fails to rebalance spot tokens due to Uniswap liquidity depletion (> 100 bps slippage).
- **Protocol Action:** Hedger halts automatic swap and logs `HedgeSlippageExceeded`.
- **Mitigation:**
  1. The Writer Pool retains its cash buffer and absorbs residual delta without executing unsafe trades.
  2. First-loss capital in `Reserve.sol` covers any deficit.
  3. Hedger resumes execution once pool liquidity deepens.

---

## Runbook 6: Compromised Operator Key & Rapid Rotation
- **Symptom:** Keeper, Hedger, atau Vol Publisher private key bocor.
- **Protocol Action:**
  1. Guardian memanggil `setHedgerLimits(maxPerpEquityBps, maxHedgeLossBps, frozen=true)` pada `WriterPool` (`WriterPool.sol:478`) — perhatikan parameter ketiga, bukan `setHedgerFrozen(true)` yang tidak ada di ABI. Kalau key Hedger yang bocor.
  2. Ganti key sesuai peran, karena otorisasinya berbeda-beda:
     - **Hedger** — `HEDGER_ROLE` di `WriterPool` (`WriterPool.sol:106`); dicabut lewat `revokeRole` dan diberikan ke address baru oleh admin (produksi: timelock 48 jam).
     - **Vol Publisher** — allowlist `isPublisher` di `VolOracle` (`setPublisher(lama,false)` lalu `setPublisher(baru,true)`), owner-only.
     - **Keeper** — **tidak ada role on-chain**. Keeper hanya butuh gas untuk memanggil `accrue`/`fillQueued`; `storeAccrual()` di `SeriesRegistry` hanya bisa dipanggil engine (`onlyEngine`), jadi ganti key keeper cukup dengan mengisi gas di address baru dan membuang yang lama. Jangan mengarang `revokeRole(KEEPER_ROLE, …)` — `Roles.KEEPER_ROLE` dideklarasikan di `src/libs/Roles.sol` tapi **tidak dipakai di kontrak mana pun**.
  3. Key operasional **tidak bisa** menarik dana atau meng-upgrade kontrak, jadi kebocorannya tidak fatal. Yang wajib diperiksa: apakah key itu juga pernah dipakai sebagai owner/deployer. Kalau ya, perlakukan sebagai kebocoran admin (lihat `docs/MAINNET_READINESS.md` §5).

---

## Runbook 7: Deep Blockchain Reorg (> 10 blocks)
- **Symptom:** Robinhood Chain node reports reorg event.
- **Protocol Action:**
  1. `ArcumIndexer` detects parent block hash mismatch.
  2. Automatically executes `indexer.rollback(safeBlock)` removing orphaned event records.
  3. Deterministic replay ingests canonical chain blocks from the fork point.

---

## Runbook 8: Complete Web Interface / API Outage (Independent Exit)
- **Symptom:** Vercel / Cloudflare hosting or Bun API server is offline.
- **Protocol Action:**
  1. Users download the standalone, script-free `arcum-independent-exit-guide.html` from `/exit` or repository root.
  2. Users execute option sales or Writer Pool withdrawal claims directly on Robinhood Chain using `cast` (Foundry) or Blockscout contract write tabs.
  3. No central intermediary can prevent user withdrawals.
