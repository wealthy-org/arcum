# Caveat Closure — design, matrix, and party notes

**Date:** 2026-11-20
**Chain:** Robinhood Chain Testnet, chainId `46630` (live stack: `deployments/46630.json`)
**Scope:** close the caveats that made "the stack is live" true but "the stack is production shaped" false. No new
product surface, no mock price paths, no demo minting.

---

## 1. What "caveat" meant here

Five classes of caveat were open before this pass. Each one is something a reviewer could point at and correctly say
"that is not what the docs claim":

1. **Admin actions are instantaneous.** `PRIVILEGE_MAP.md` advertises a 48-hour timelock at `0x58c2…a94e`. On 46630
   there is no timelock contract and every admin is a hot EOA.
2. **The TWAP reference is not a TWAP.** `deployments/46630.json` points `twapReference` at `0x6670cA5c…`, which on that
   chain cannot answer `getPool` (there is no Uniswap v3 pool for stock/USDG), so `referencePrice` returns 0 and the
   band check silently disables itself.
3. **No account abstraction.** Users must hold ETH on Robinhood Chain and send plain EOA transactions; there is no
   smart account and no gas sponsorship, so "agent-native, AA-ready" was prose, not code.
4. **No IV source on testnet.** `VolOracle` exists in `src/` and is wired by `DeployProduction.s.sol`, but the live
   46630 engine still prices on the hardcoded `5000` bps fallback because the oracle was never deployed there.
5. **Deployer keys are burnt.** The staging deployer `0x1B4F…3e45` was pasted into a chat on 2026-11-17 and still holds
   ownership on the live contracts. The production script refuses that key; nothing on-chain revoked it.

---

## 2. Caveat matrix

| ID | Caveat | Evidence it was real | Closure | Proof | Residual |
|---|---|---|---|---|---|
| C1 | Instant admin, no timelock | `docs/PRIVILEGE_MAP.md` claims 48h; no `TimelockController` in `deployments/46630.json` | `CaveatCloser` deploys `TimelockController`, hands VolOracle/KeeperTwap/Paymaster to it, raises delay to 48h via a self-executed `updateDelay` | `test/CloseCaveats.t.sol::testEverythingEndsUpBehindTheTimelock`, `::testRaisedDelayBlocksInstantExecution` | Engine/pool/registry on 46630 are still owned by the old EOA; moving those needs a second pass |
| C2 | "TWAP" reference returns 0 | no pool at `twapReference` on 46630 | `KeeperTwapReference`: keeper posts `(stock, priceWad)` at most once per `minInterval`, `referencePrice` integrates linearly over `window`, stale → 0 | `test/KeeperTwapReference.t.sol` (11 tests: math, staleness, interval, access, spike dilution) | It averages *our published prices*, not executed trades. Must never be described as a market TWAP |
| C3 | No smart account, no sponsorship | no `src/aa/` before this pass | `ArcumAccount` + `ArcumAccountFactory` (CREATE2, counterfactual) + `ArcumPaymaster` (per-account budget, deposit-funded) | `test/ArcumAA.t.sol` (8 tests) against the **real** EntryPoint v0.7 on 46630 | Sponsorship is an allowlist decision; there is no signature-based open faucet by design |
| C4 | Engine prices on 50% fallback on testnet | 46630 manifest has no `volOracle` | `CaveatCloser` deploys `VolOracle`, configures each stock, grants the publisher role to a keeper key | `test/CloseCaveats.t.sol::testVolOracleIsConfiguredAndPublishingIsSeparatedFromAdmin` | Wiring the *live* engine to the new oracle is a separate owner action (engine is not owned by the timelock yet) |
| C5 | Deployer key is compromised and retains power | `docs/MAINNET_READINESS.md` §6/§7 | script requires a key that is not the leaked one, and every transfer ends at the timelock, not the signer | `test/CloseCaveats.t.sol` role assertions | The old staging deployer keeps owner on the pre-existing 46630 contracts until they are re-owned |
| C6 | "AA works" unproven | no test touched the canonical EntryPoint | userOp built, signed, and submitted through `handleOps` on a 46630 fork | `test/ArcumAA.t.sol::test_userOpExecutesThroughRealEntryPoint`, `::test_wrongSignerIsRejectedByEntryPoint` | Bundler infrastructure (a real relayer) is out of scope |
| C7 | Paymaster could become an open faucet | n/a before this pass | validation requires `budgetOf[sender] >= maxCost`; `postOp` charges actual cost only | `test/ArcumAA.t.sol::test_paymasterSponsorsUserOp`, `::test_paymasterRefusesAccountWithoutBudget` | Budgets are wei-denominated against the EntryPoint deposit, not USDG; pricing that is an operator concern |
| C8 | Delay raise could be faked by a bootstrap bypass | a 48h timelock cannot hand over ownership in one broadcast | bootstrap at delay 0, then `updateDelay(48h)` + revoke the bootstrap actor's roles, all in the same transaction | `test/CloseCaveats.t.sol` runs; `forge script` simulation 7,153,961 gas / 1 tx | Delay is raised *after* the handover ops in the same tx; that ordering is documented and asserted, not implied |
| C9 | Manifest drift: app reads stale addresses | no `46630-caveats.json` | script writes `deployments/46630-caveats.json` (timelock, oracle, TWAP, factory, paymaster, stocks, delays) | `vm.writeJson` in broadcast context; path asserted by the file appearing after a broadcast | App/keeper must actually read the new file; that is a frontend task, not a contract one |

---

## 3. Plan (as implemented)

### 3.1 New contracts

| File | Role |
|---|---|
| `src/KeeperTwapReference.sol` | `IPriceReference` backed by keeper observations. Ring buffer of 64 `(uint64 ts, uint192 priceWad)`, trapezoid TWA over `window`, staleness → 0, `minInterval` rate limit, `Ownable2Step`, price sanity band `[1e12, 1e27]` wei-per-whole-token |
| `src/aa/IEntryPoint.sol` | Minimal ERC-4337 v0.7 ABI: `PackedUserOperation`, `IAccount`, `IPaymaster`, `IEntryPoint`. No `account-abstraction` dependency |
| `src/aa/ArcumAccount.sol` | One-owner account: `validateUserOp` (ECDSA over `userOpHash.toEthSignedMessageHash()`), `execute`, `executeBatch`, prefund payment, `setOwner` by owner **or self** so rotation goes through a userOp |
| `src/aa/ArcumAccountFactory.sol` | CREATE2 with `keccak256(abi.encode(owner, salt))`; `getAddress` matches `createAccount` |
| `src/aa/ArcumPaymaster.sol` | Deposit-based sponsorship with explicit per-account budget and `postOp` charging actual cost |
| `script/CaveatCloser.sol` | The orchestration itself, in a constructor so every nested call lives in one real transaction |
| `script/CloseCaveats.s.sol` | Env parsing, `DRY_RUN`, broadcast, manifest write |

### 3.2 Ordering inside `CaveatCloser` (why it is not arbitrary)

1. Deploy the timelock with `tlInitialDelay` (0) and the bootstrap contract as proposer/canceller/executor.
2. Deploy + configure VolOracle, KeeperTwapReference, factory, paymaster (fund the paymaster deposit).
3. `transferOwnership(timelock)` on VolOracle, KeeperTwap, paymaster.
4. Schedule **and execute** `acceptOwnership()` on both two-step owners — the timelock is `msg.sender`, so this is real
   acceptance, not a pending handover.
5. Schedule and execute `updateDelay(tlFinalDelay)` **as the timelock**. Scheduled while the delay is still 0, so it
   lands in the same transaction.
6. Revoke the bootstrap contract's proposer/canceller/executor and admin roles. The timelock remains admin of itself
   (OZ v5 grants `DEFAULT_ADMIN_ROLE` to `address(this)`), so future role changes are timelocked proposals.

Step 5 before step 6 matters: after the raise, a *new* proposal would wait 48h; already-scheduled work is unaffected
because readiness is fixed at schedule time. After step 6, the deploy script address cannot propose or execute anything.

### 3.3 Commands

```bash
cd contracts

# inputs only, no broadcast (forge has no --dry-run flag; the env var is the switch)
DRY_RUN=true PRIVATE_KEY=$PK STOCK_SYMBOLS=NVDA,AAPL,QQQ \
  STOCK_NVDA=0x98a7… STOCK_AAPL=0xb5c3… STOCK_QQQ=0xd5F4… \
  forge script script/CloseCaveats.s.sol:CloseCaveats --rpc-url $RPC

# simulation (executes the constructor on a fork, sends nothing)
forge script script/CloseCaveats.s.sol:CloseCaveats --rpc-url $RPC

# real broadcast
forge script script/CloseCaveats.s.sol:CloseCaveats --rpc-url $RPC --broadcast --slow
```

`PRIVATE_KEY` is required; the script does not accept a keystore account because the rehearsal path needs a plain key.

---

## 4. Verification actually run

```
forge build
forge test --match-contract KeeperTwapReferenceTest   -> 11 passed, 0 failed
forge test --match-contract ArcumAATest               ->  8 passed, 0 failed   (fork 46630, real EntryPoint v0.7)
forge test --match-contract CloseCaveatsTest          ->  4 passed, 0 failed   (fork 46630)
forge script script/CloseCaveats.s.sol:CloseCaveats --rpc-url <46630>   -> SIMULATION COMPLETE,
                                                       7,153,961 gas, 1 transaction
DRY_RUN=true forge script …                            -> inputs valid, nothing deployed
```

Behaviours now asserted, not assumed:

- TWAP of `(100 @ t0, 300 @ t0+1800)` over a 3600s window is exactly `250`; a `1000` spike posted for one interval is
  diluted well below the spike; history older than `window` returns `0`, never the last price.
- A userOp signed by the wrong key is rejected by the canonical EntryPoint (`AA24`), not by our test harness.
- A userOp with a paymaster and no budget reverts; with a budget it executes and the budget decreases by the actual cost.
- Ownership rotation through a userOp works because `setOwner` accepts `msg.sender == address(this)`.
- After the closure script, `tl.getMinDelay() == 172800` and a proposal scheduled afterwards cannot be executed in the
  same block.

---

## 5. Party notes (multi-persona review of this design)

**Analyst.** "Keeper TWAP" is the weakest name in the repo. It averages our published prices, not trades. Ship it as
*reference price with a keeper-fed average*, and keep the word TWAP out of any user-facing surface. Decision: contract
name stays (interface parity with `IPriceReference`), comments and docs say what it is.

**Architect.** Two rejected alternatives:
1. *Fake a Uniswap pool or deploy a v3 factory on 46630.* Rejected: an oracle reading a pool we control is a
   self-referential price, which is worse than no oracle because it looks real.
2. *Keep orchestration inside the `.s.sol` and pre-approve the script contract's roles.* Rejected after Forge refused
   `address(this)` inside a script contract ("Script contracts are ephemeral"). The `CaveatCloser` constructor keeps the
   same one-transaction property without a permanent, unowned role holder.

**Dev.** The timelock bootstrap only works because OZ v5 fixes readiness at *schedule* time. A naive reading of
`updateDelay` suggests you need two broadcasts; you do not, as long as the raise is scheduled before the delay changes.
The revision also removed an earlier variant that granted roles to `msg.sender`: the constructor's `msg.sender` and the
internal `scheduleBatch` caller are different addresses, which produced
`AccessControlUnauthorizedAccount`. Both facts are now encoded in the structure, not in a comment.

**QA.** Two real bugs were found by testing rather than review:
1. ERC-4337 v0.7 `postOp` takes **four** arguments (`…, actualUserOpFeePerGas`). Our first interface declared three, so
   the EntryPoint called an unknown selector and the sponsored op reported `success = false` *without reverting*
   (`PostOpReverted`). Fixed in `IEntryPoint`/`ArcumPaymaster`.
2. Foundry 1.8 keeps the pre-warp `block.timestamp` inside one frame; a loop that warps and posts alternately produced
   `PostTooSoon`. The test now advances a local clock variable. Production code was unaffected.

**Skeptic.** "The delay is 48h, so a compromised proposer has 48h to be noticed — but the proposer set is still one EOA
on testnet." Accepted and documented as residual risk C1/C5: the timelock changes *speed*, not *who*, and replacing the
EOA with a Safe is a separate key-management step.

**Ops.** Remaining runbook, not code: point the app at `deployments/46630-caveats.json`, start the keeper so
`KeeperTwapReference` has at least two observations before anything reads it, start the vol poster, and re-own the
pre-existing 46630 contracts (engine, pool, registry, guard) which this pass deliberately does not touch.

---

## 6. Non-goals

- Migrating `ArcumEngine`/`WriterPool`/`SeriesRegistry` ownership on the live testnet stack.
- Real bundler/relayer operation, session keys, or paymaster USDG pricing.
- Any change to `UniswapV3TwapReference` (still correct where a real pool exists).
- Mainnet (4663) deployment. This pass is testnet-shaped and says so in the script header.