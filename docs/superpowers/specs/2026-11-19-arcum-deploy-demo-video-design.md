# Arcum — Deploy Demo Video (design)

Date: 2026-11-19
Status: v2 shipped (`artifacts/video/arcum-deploy-demo.mp4`, 91.6s, 1178×882, h264)
Trigger: manager sent an X clip (`ss/ssstwitter.com_1795113159060.mp4`) asking
"mas kevin bisa bikin gini buat arcum?"

## What the reference clip actually is

102s, 1178×882, macOS Terminal. No browser, no web UI. Contents:

- ASCII banner `FLOATS`, `LAYERZERO V2 :: MULTICHAIN DEPLOY`
- `Welcome back, DEPLOYER. Today it is Thursday 19 November 2026!`
- param table: `HUB ¦ Robinhood Chain Testnet [46630 · EID 40451]`,
  `SPOKE ¦ Ethereum Sepolia [11155111 · EID 40161]`, `QUEUE ¦ 11 stages · 13 transactions · 2 chains`
- confirm prompt `'Float (D)eploy' or 'Float (A)bort'? > D`
- 11 stages of `forge script --broadcast --slow`: CREATE2 `fIPOOFTAdapter`,
  `NavPublisher`, `fIPO_OFT`, `NavMirror`, then `TimelockController.scheduleBatch`
  → `√ timelock delay 300s elapsed` → `executeBatch`, receipt per tx
  (`hash`, `to`, `from`, `nonce`, `gas used`, `fee`, `√ CONFIRMED`)

So the ask has two readings, and they are different projects:

| Reading | Deliverable | Repo evidence |
|---|---|---|
| **A. Deploy theater** | branded staged deploy CLI for Arcum, recordable in one take | `scripts/deploy_staging.sh` orchestrates 5 raw steps, no presentation; `contracts/script/Deploy*.s.sol` exist |
| **B. Prompt-driven test recorder** | agent that tests the web app on prompt and emits MP4 | `scripts/test_e2e_browser.py` is `urllib` + string checks, not browser automation; `recordings_v1/` = 20+ hand-recorded clips |

Manager's sentence is compatible with both. v1 answers **A** because A is what the
clip shows frame for frame, and because Arcum can already run every stage for real.

## Decision (v1)

Build the deploy runner as a real orchestrator with a presentation layer, then
render the video deterministically from its transcript instead of screen-capturing
a desktop session.

**Why render, not screen-record:** a desktop capture on Windows drags in window
chrome, notifications, DPI scaling, and per-take drift. Rendering from a captured
transcript gives fixed 1178×882, identical output every run, and a git-diffable
artifact (`session.json`) that proves what was on screen.

**Why local Anvil, not testnet/mainnet:** `deployments/46630.json` is empty on
chain and `TAHAP0_CLEANUP_LOG.md` documents past fake-deployment claims. A demo
that shows `CONFIRMED` badges on a network where nothing is deployed would
repeat that damage. Anvil gives real CREATE/CREATE2, real tx hashes, real gas,
real receipts — and the banner and receipt stage say `chain 31337 · local only ·
no real funds` on screen.

## How it works

1. `scripts/arcum_deploy_demo.py` — 8 stages, every value from a real command:
   1. `HOST` toolchain: `forge`, `anvil`, `cast`, `bun`, `python` versions
   2. `MATH` `scripts/differential_test.py` → 7 vectors, `Max Price Diff: 0.00e+00`
   3. `BUILD` `forge build` (Cancun EVM, via_ir)
   4. `CHAIN` fresh `anvil --chain-id 31337`, rpc handshake, block, signer balance
   5. `ANVIL` `forge script script/Deploy.s.sol --broadcast --slow` — 14 deployments
      parsed from `broadcast/Deploy.s.sol/31337/run-latest.json`, checksummed with
      `cast to-check-sum-address`, gas from the real receipts
   6. `VERIFY` `cast code` bytecode size per contract + `engine.alpha()` read back
   7. `WEB` `bun run build` (real bundle build, ~29s)
   8. `RECEIPT` address/gas table, chain, parity, `real funds: none touched`
   Writes `artifacts/video/session.json` = `{ops:[...], facts:{...}}`.
2. `scripts/render_terminal_video.py` — parses ANSI runs, wraps to a 147-col grid,
   draws macOS-style chrome + blinking cursor, pipes raw RGB frames to ffmpeg.

### Reveal model (v2 — matches how a real CLI actually behaves)

v1 revealed one line every ~0.045 s, which read as a teleprompter, not as a CLI.
The reference clip never does that: a command is echoed, then the whole output
block lands at once, then the pane sits still while the next stage prints.

So the orchestrator buffers lines and flushes them as a **burst**:

- `line()` appends to `PENDING`; nothing is emitted yet
- `flush(hold)` emits `{op:"burst", lines:[...], dt:hold}` — every line in the
  block shares one timestamp, so it lands in a single frame
- `wait()` and `clear()` flush first; a burst's own hold is
  `max(0.22, slowest_line_dt * 2.2)` unless the caller passes an explicit hold
- stage headers, `√` status lines, and the 14-tx receipt table get explicit holds
- command invocations use `typed()` (0.010 s/char default) then `wait(0.45)`, so
  the echo streams like a person typing and the output then dumps

Receipts stream in chunks of three transactions per burst, the way `forge script`
keeps printing while it works.

`--scale` (default 4.0 in the shipped cut) multiplies burst holds and typing pace.
Explicit `wait()` holds are deliberately scaled by only `min(scale, 1.6)`, so
pauses do not grow into dead air as the cut is slowed down.

Pacing lives in the renderer, not the orchestrator, so the recorded session stays
raw and the cut can be re-timed without re-running the chain.

## Honesty rules baked in

- Chain identity printed on screen: `31337 · anvil · local only`.
- No `live on-chain`, no `deployed`, no `audited`.
- Glyphs limited to what Consolas actually has (`√ × + ▌` instead of `✔ ✘ ⊕ ▍`)
  — verified against the font cmap so no tofu boxes reach the video.
- If a stage fails the runner aborts and prints the failure frame instead of
  continuing with fabricated numbers.

## Non-goals (v1)

- No narration / voiceover, no captions, no music.
- No testnet or mainnet broadcast.
- No LayerZero/OFT stage — Arcum has no cross-chain contracts, and inventing one
  for the video would be exactly the theatre this design forbids.
- No prompt-driven recording agent (reading B) — that is a separate build.

## Next step if B is also wanted

`scripts/test_e2e_browser.py` must first become real browser automation
(Playwright/agent-browser driving the actual UI), then a recorder wraps it. Local
model or local-only tooling preferred: this repo carries `mcp-audit.md`,
`PRIVILEGE_MAP.md`, and `docs/OWNER_DECISIONS.md`, so shipping page content to a
third-party GPT-4o endpoint is a policy question, not a convenience question.

## Reproduce

```bash
python scripts/arcum_deploy_demo.py                          # real stages -> session.json
python scripts/render_terminal_video.py --scale 4.0          # -> arcum-deploy-demo.mp4
```

Posters: `artifacts/video/poster-banner.png`, `artifacts/video/poster-receipts.png`.