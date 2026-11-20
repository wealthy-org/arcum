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

### Runbook 6b: Memindahkan owner kontrak lama `46630` dari key yang bocor

- **Kondisi:** ~~`ArcumEngine 0x98F7B4Ae…280C`, `PriceGuard 0x3D541ad6…3dBe`, dan `SeriesRegistry 0x9c0B29e8…a82B` masih dimiliki `0x1B4Faa130Aa607Fce29F9AAd6120b4492DE93e45`~~ — **SUDAH DIROTASI 2026-11-20.** Ketiga kontrak sekarang dimiliki `0x249ACeb7d446F5f0375e6E6b6F3b88f88e399E6b` (timelock). Bukti: `owner()` ketiganya = alamat timelock, tx `0x3aca4f25bafea9fe07accb29ad8756eeceac0d2f512e35b21986c100a269f3d8` (engine, blok 155914150), `0x2b724b7631b62ae939d0e076f5d81369bf89065a913516f07c90c0ea8daf2ca5` (guard, blok 155914166), `0x4d2e18cf5e1aaa451a663801bfa82c49216227a3057a036bebd7cc2d8dee7d5a` (registry, blok 155914183); total 86.557 gas, ~0,00000087 ETH. Key staging `0x1B4Faa13…3E45` **tidak lagi memegang owner di mana pun**.
- **Kalau perlu diulang** (kontrak lain dengan owner key bocor): `contracts/script/RotateLegacyOwner.s.sol`. Ketiganya `Ownable` satu langkah, tidak ada `pendingOwner`.
- **Action:**
  1. Jalankan dengan `PRIVATE_KEY` = key owner **saat ini** (yaitu key staging yang bocor). Ini satu-satunya pemakaian yang masih sah untuk key itu di testnet, dan `DeployProduction.s.sol:284` tetap menolaknya untuk produksi.
  2. Simulasi dulu tanpa `--broadcast`. Script akan mencetak `[skip] signer is not owner` bila key yang dipakai bukan owner — itu perilaku yang benar, bukan error.
  3. `forge script script/RotateLegacyOwner.s.sol:RotateLegacyOwner --rpc-url $RPC --broadcast --slow`
  4. Verifikasi: `cast call <kontrak> 'owner()(address)'` → `0x249ACeb7d446F5f0375e6E6b6F3b88f88e399E6b`.
- **Konsekuensi yang harus diterima lebih dulu:** setelah rotasi, setiap aksi admin pada ketiga kontrak itu butuh proposal + 48 jam. Tidak ada jalan pintas untuk membatalkan. Karena itu jangan rotasi sebelum daftar saham dan parameter guard final.
- **Bug/RPC yang ditemui saat eksekusi:** `cast`/`forge` di mesin Windows ini ditolak edge RPC (`os error 10054`, lalu `failed to retrieve chain ID`) padahal `bun fetch` ke URL yang sama menjawab `eth_chainId = 0xb626`. Transport-nya yang ditolak, bukan chain-nya. Workaround: `bun app/ops/rpc-proxy.mjs` lalu pakai `--rpc-url http://127.0.0.1:8547`. Relay itu wajib `connection: close` + retry, kalau tidak socket keep-alive diputus di tengah `forge` (`relay upstream error: socket connection was closed unexpectedly`). Relay juga menyerialkan request ke upstream: `forge` mengirim beberapa panggilan sekaligus (chainId, nonce, gas, block, storage) dan burst itulah yang memicu socket ditutup — retry saja tidak cukup, `vm.startBroadcast` sempat gagal `502` sebelum antrean ditambahkan. Relay tetap best-effort: untuk baca-saja sekali jalan, panggil RPC langsung dari `bun`/Python lebih andal; `cast call` lewat relay bisa gagal `502` walau sudah retry 3×. Percobaan pertama dengan relay lama berakhir `Error: EVM error` dan **tidak** membroadcast apa pun (owner masih key lama saat diperiksa), percobaan kedua berhasil — selalu periksa `owner()` sebelum mengulang.
- **Jangan berhenti di `owner()`.** `writerPoolProxy 0x1F79F6D8…550F` tidak punya `owner()` dan slot admin ERC-1967-nya kosong, tapi kontraknya UUPS: upgrade authority = `DEFAULT_ADMIN_ROLE` di storage proxy, dan role itu **masih dipegang key bocor** `0x1B4Faa13…3E45`. Rotasi `Ownable` tidak menyentuhnya. Urutan perbaikan: `forge script script/RotateLegacyPoolAdmin.s.sol:RotateLegacyPoolAdmin --rpc-url $RPC --broadcast --slow` (grant ke timelock dulu, renounce diri sendiri belakangan; kebalikannya bisa mengunci role). Cek hasil: `cast call $POOL 'hasRole(bytes32,address)(bool)' 0x00…00 $TL` = true dan `… $SIGNER` = false. **Sudah dijalankan 2026-11-20:** tx `0xe5fe6efe…6b198` (grant, gas 56.093) + `0xf9f4fa73…c9d8` (renounce, gas 29.809), total 0,00000085902 ETH; hasilnya timelock true, key staging false.
- **Jangan percaya satu daftar kontrak.** Rotasi berbasis daftar akan melewatkan yang tidak ada di daftar: `feeRouter 0x3cd28517…f968` (`Ownable`) dan `reserve 0x607cdaff…9B2d` (`AccessControl`, `setParams` di `src/Reserve.sol:43`) baru ketemu setelah menyapu semua alamat di `deployments/46630.json`. Perbaikannya `forge script script/RotateLegacyRemainder.s.sol:RotateLegacyRemainder --rpc-url $RPC --broadcast --slow` (3 tx, 142.644 gas). Cara menyapu: `cast call <alamat> 'owner()(address)'` dan `cast call <alamat> 'hasRole(bytes32,address)(bool)' 0x00…00 $OLD` untuk setiap alamat di manifest — yang membalas `none` belum tentu tanpa admin.
- **Verifikasi setelah rotasi:** `eth_call accrueMany([seriesIdAt(0)])` dari keeper ke engine mengembalikan `0x` (tidak revert), jadi keeper tidak butuh role dan tidak terpengaruh pindahnya owner. `cast call … --from <keeper>` lewat relay bisa gagal `502`; itu kegagalan transport, bukan revert.
- **Cara memverifikasi admin timelock dengan benar:** di OZ v5 `DEFAULT_ADMIN_ROLE` adalah `0x0000…0000`, **bukan** `keccak256("DEFAULT_ADMIN_ROLE")`. `cast keccak "DEFAULT_ADMIN_ROLE"` menghasilkan `0x1effbbff…a4c86d`, dan `hasRole` dengan hash itu mengembalikan `false` untuk semua address termasuk timelock — itu bukan bukti timelock kehilangan admin, itu role yang memang tidak pernah diberikan. Perintah yang benar:
  ```bash
  cast call 0x249ACeb7d446F5f0375e6E6b6F3b88f88e399E6b     'hasRole(bytes32,address)(bool)'     0x0000000000000000000000000000000000000000000000000000000000000000     0x249ACeb7d446F5f0375e6E6b6F3b88f88e399E6b --rpc-url $RPC   # true
  ```
  Sudah diperiksa 2026-11-20: `true`. `getRoleAdmin(PROPOSER_ROLE)` juga `0x00…00`, artinya hanya proposal yang lolos timelock yang bisa mengubah role.
- **Catatan:** `writerPoolProxy 0x1F79F6D8…550F` **tidak** punya `owner()` (slot admin ERC-1967 kosong, implementation slot terisi). Proxy itu tidak tercakup script ini; jalur upgrade-nya perlu diperiksa terpisah sebelum dirotasi.

---

### Runbook 6c: Keeper berhenti meng-accrue (jadwal, log, dan gejalanya)

- **Gejala:** `lastAccrual` di `SeriesRegistry.seriesOf(id)` tidak bergerak, padahal pasar buka. `norm` juga tidak berubah.
- **Yang lebih berbahaya:** keeper yang **terlihat** jalan. Cek log, jangan cek "task ada di Task Scheduler":
  ```powershell
  Get-Content app\logs\keeper.log -Tail 20
  schtasks /query /tn ArcumKeeper /v /fo LIST
  ```
  Baris sehat berisi salah satu dari `{"action":"accrueMany",...,"status":"success"}` atau `{"action":"accrueCheck","dueCount":0,...}`. Kalau log berhenti di `$ bun run src/keeper/run.ts` tanpa JSON apa pun, prosesnya keluar tanpa menjalankan `tick()` — itu bug yang pernah terjadi (lihat `ORACLE_CHAINLINK_ARCUM.md` §3) dan sudah diperbaiki; kalau muncul lagi, jangan menganggapnya "tidak ada yang perlu di-accrue".
- **Pasang / lepas jadwal:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File app\ops\install-keeper-task.ps1
  powershell -ExecutionPolicy Bypass -File app\ops\uninstall-keeper-task.ps1
  ```
  Task berjalan sebagai user saat ini, hanya ketika user logon. Mesin yang reboot dan tidak ada yang login tidak akan meng-accrue — untuk produksi, pindahkan ke service/VPS.
- **Dua setelan yang wajib benar dan tidak dibuat oleh `schtasks /create`:** `DisallowStartIfOnBatteries` dan `StopIfGoingOnBatteries`. Defaultnya `true`, artinya task tidak jalan saat laptop pakai baterai dan **berhenti** begitu kabel dicabut. Untuk job latar di laptop itu berarti keeper diam persis saat mesin diangkat, sementara daftar task tetap menampilkan "Ready". Kedua script installer sekarang mematikannya dan menyalakan `StartWhenAvailable` (jalan yang terlewat karena sleep dieksekusi saat bangun). Periksa dengan:
  ```powershell
  (Get-ScheduledTask -TaskName ArcumKeeper).Settings | Select DisallowStartIfOnBatteries, StopIfGoingOnBatteries, StartWhenAvailable
  ```
- **Pemicu umum lain:**
  1. Sesi pasar bukan `REGULAR`/`EXTENDED` → keeper sengaja tidak menandatangani (`skipped: market session is not live`).
  2. Gas habis di `KEEPER_ADDRESS`. Cek `cast balance <keeper> --rpc-url $RPC`; satu putaran 3 seri ≈ 200.199 gas.
  3. `KEEPER_PRIVATE_KEY` hilang dari `app/.env` → keeper berhenti saat load (fail closed), bukan jalan dengan key default.
- **Jangan:** menaikkan frekuensi di bawah 1 jam atau menghapus filter `totalSupply > 0` untuk "memaksa" ada aktivitas. Funding linear terhadap waktu; accrue seri kosong hanya membakar gas (terukur: 443.781 gas per putaran untuk 8 seri kosong di `46630`).

### Runbook 6d: Mempublikasikan vol (dan kenapa boleh menolak)

- **Sumber harga:** `vol-engine/fetch_prices.py` → `data/<symbol>_daily.json` (Yahoo Finance chart API, close harian). File menyimpan URL sumber + waktu ambil.
- **Jadwal yang berjalan sekarang:** Windows Task Scheduler `ArcumVol`, tiap 30 menit, entry point `vol-engine/publish_once.py` (fetch lalu post, key dibaca dari `app/.env`), log `app/logs/vol.log`. Pasang/lepas: `vol-engine/ops/install-vol-task.ps1`, dan `app/ops/uninstall-keeper-task.ps1` mencabut **kedua** task (`ArcumKeeper` + `ArcumVol`).
- **Kenapa 30 menit:** TTL reading 3600 s. Satu putaran gagal tidak boleh langsung berarti `StaleVol` selama satu jam penuh.
- **Perintah:**
  ```bash
  cd vol-engine
  python fetch_prices.py
  python post_vol.py --symbols NVDA,AAPL,QQQ --prices NVDA=data/nvda_daily.json --prices AAPL=data/aapl_daily.json --prices QQQ=data/qqq_daily.json --ttl 3600
  ```
- **Kalau `post_vol.py` keluar dengan kode 4** ("refusing to invent a volatility"): itu benar. Yang salah adalah sumber datanya, bukan guard-nya. Perbaiki datanya; jangan menambahkan fallback angka.
- **Kalau keluar dengan `HTTP Error 403`:** RPC menolak request tanpa User-Agent. `JsonRpc` sudah mengirim `user-agent: arcum-vol-publisher/1.0`; kalau muncul lagi, periksa apakah endpoint butuh header lain.
- **Kalau keluar dengan `Transaction had invalid fields: {'to': ...}`:** alamat `to` harus bentuk EIP-55 (checksum), bukan all-lowercase. `eth_account` menolak menandatangani yang lowercase; ABI encoding tidak peduli. Sudah ditangani `_checksum_address()`.
- **Verifikasi hasil:** `cast call $VOL_ORACLE 'sigmaFor(address)((uint64,bool))' <stock> --rpc-url $RPC` harus `(>0, true)`.

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
