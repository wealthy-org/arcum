---
title: 'Finalisasi mainnet staging 4663: live, terverifikasi, jujur'
type: 'feature'
ticket: ''
created: '2026-11-17'
status: 'in-progress'
baseline_revision: 'd039df7'
route: 'oneshot'
route_source: 'pinned'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Deploy staging Arcum ke Robinhood mainnet 4663 sudah sukses (32/32 tx, 17 Nov 2026), tapi belum "clear dan live rill": UI masih mengunci 4663 dan menampilkan notice yang sekarang salah ("belum ada kontrak aktif di mainnet"), source kontrak belum terverifikasi di explorer, belum ada bukti E2E write path di mainnet, manifest belum dicommit, dan handover docs belum mencatat deployment.

**Approach:** Finalisasi seluruh sisa pekerjaan post-deploy secara jujur: commit manifest, buka chain 4663 di UI dengan alamat kontrak asli + label staging yang jujur (mock USDG & harga), verifikasi source di Blockscout, jalankan E2E on-chain nyata (mint → deposit WriterPool → cek shares), update HANDOVER_PACKAGE.md, commit semua. Item yang tidak bisa dikerjakan secara jujur hari ini (ownership transfer butuh keputusan wallet baru; oracle produksi butuh scope besar) dicatat terbuka sebagai deferred work, bukan ditutup palsu.

## Boundaries & Constraints

**Never:** Tidak mengubah kontrak atau redeploy. Tidak mengganti default chain UI dari testnet (testnet tetap default agar alur testnet tidak rusak). Tidak menampilkan klaim produksi palsu di UI/docs — semua label wajib menyebut staging/mock. Tidak memindahkan ownership (butuh keputusan manajer soal wallet). Tidak membangun oracle baru (out of scope).

## Implementation Notes

Rute oneshot: semua task kecil-menengah dan sudah diinvestigasi penuh — alamat kontrak, ABI, dan state on-chain sudah diverifikasi via cast sebelum planning. Tidak ada keputusan desain yang belum settle.

Implemented: mainnet chain/config addresses, chain-aware UI reads and faucet/trade guards, Contracts/Docs honest staging labels, HANDOVER update. `web` TypeScript and Vite production build pass. Live E2E mint + WriterPool deposit succeeded; deployer share balance became `48`.

Blockscout source verification attempted with `forge verify-contract`; Cloudflare challenge returned HTML/403, so mainnet badges remain UNVERIFIED. Ownership transfer skipped because manager supplied no safe destination. Production oracle skipped because no production oracle implementation exists.

Follow-up session (production path, same initiative):

- Built `PriceGuardProd` (reads real Chainlink `AggregatorV3`, no mock fallback, staleness/session/try-catch fail-safe) — 28/28 tests pass.
- Built `DeployProduction.s.sol` (env-driven, fail-fast refusals: codeless/zero-address/unsupported decimals/stale feed) — 4/4 refusal tests pass; `verify-production-deploy.sh` E2E on anvil PASS (guard read $142.50 fresh, ownership landed on owner address).
- Verified on-chain (cast, mainnet 4663): real USDG `0x5fc5360D...d168` (decimals 6, "Global Dollar"); 5 stock tokens 18-dec with `uiMultiplier()`; Chainlink feeds for NVDA/AAPL/QQQ (8 dec, heartbeat 86400s). TSLA & SPY: **no feed on 4663** — cannot join production launch.
- Ran `DeployProduction` with `DRY_RUN=true` against real mainnet RPC: preflight passed (`inputs valid, nothing deployed`); MAX_AGE defaults raised to 90000s to match the 86400s feed heartbeat.
- Added `contracts/.env.production.example` (verified values, no secrets) + `docs/CHAIN_FACTS.md` (evidence + commands).
- Remaining production blockers are human decisions only: non-compromised owner wallet, signed production scope (NVDA/AAPL/QQQ only), manual Blockscout verification, optional TWAP pool.

## Plan Change Log

## Review Triage Log

- medium/deferred: independent quick-review subagent unavailable in current harness; direct inspection plus `git diff --check`, TypeScript, Vite build, and live cast evidence used instead.
- medium/deferred: Blockscout verification blocked by Cloudflare; manual browser verification remains open.
- medium/deferred: production launch blocked on non-compromised owner wallet (manager decision); all code-path blockers resolved by production path above.
- low/noted: TSLA/SPY excluded from production scope because Chainlink lists no feed for them on 4663; UI staging (testnet/mainnet demo) keeps them unchanged.

## Verification

**Commands:**
- `git -C . status --short` -- expected: perubahan ter-commit bersih pada file yang disentuh
- `cd web && bun run build` (atau `npx tsc --noEmit`) -- expected: build lulus tanpa error TS
- `cast call <writerPool> "balanceOf(address)(uint256)" <deployer> --rpc-url <mainnet rpc>` -- expected: shares > 0 setelah deposit E2E
- `cast call <engine> "owner()(address)"` -- expected: 0x1B4Faa130Aa607Fce29F9AAd6120b4492DE93e45 (ownership tercatat, bukan dipindah)
- Blockscout API `GET /api/v2/addresses/<addr>` -- expected: kontrak terverifikasi atau hasil gagal yang dicatat jujur
