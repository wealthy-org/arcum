# Register & Capability Page — On-Chain Verification (2026-11-20)

Manager sent two screenshots of `/contracts` with the note "waduh kok bisa?".
Both screenshots are crops of the same page. This report separates what the chain
actually says from what the screenshots showed, and records what was changed.

## 1. What the screenshots showed

| Crop | Content | Reading |
|---|---|---|
| `ss/image copy 40.png` | "Protocol Capability Status (Honest Sandbox Transparency)" table, 7 modules, status text like `Later-phase: belum aktif`, `Sigma: di-set manual (testnet)`, `Disabled (testnet)`, `Owner: EOA deployer (testnet)`, `Belum aktif. Pakai wallet biasa` | product-scope statement per network |
| `ss/image copy 41.png` | contract register, 8 rows, Address column literally `Belum dideploy` for every row | a build that never wired addresses, or a page that turned an RPC failure into "not deployed" |

Note: the string `Belum dideploy` does not exist in the current web source tree.
`git log -S "Belum dideploy"` shows it was introduced before `8c5cf17`
("finalize Robinhood mainnet staging live config") and removed at that commit.
So screenshot 41 predates that build.

## 2. What the chain says right now

Read directly from `https://rpc.testnet.chain.robinhood.com` (chain 46630):

```
block    155,690,586
chainId  answered 46630 (expected 46630)
verdict  VERIFIED — 20/20 alamat punya bytecode di chain 46630
deployBlock (manifest) 152,722,071
```

| name | address | bytecode |
|---|---|---|
| engine | `0x98F7B4Ae9615a655c4321b1326D588e35303280C` | 16,126 B |
| writerPoolProxy | `0x1F79F6D8eFB739c270Ec7957Fff0754151eF550F` | 130 B (proxy) |
| writerPoolImpl | `0xb3EB4f6E3A0720DE6dD26B168d882813aF772446` | 23,465 B |
| agentRouter | `0xAB3379ca486c7365C693FB6263B021759F45ffaa` | 8,804 B |
| seriesRegistry | `0x9c0B29e8faD8854DdFD6Ff1bB823E75788dEa82B` | 7,962 B |
| priceGuard | `0x3D541ad6c67b2B4CAFa1ecBC5E3aC877022c3dBe` | 2,691 B |
| reserve | `0x607cdaff55Aa86B03C3EC9075828fdbbEC879B2d` | 2,057 B |
| feeRouter | `0x3cd28517B56dCF6dBf7c405eF24184b1CF41f968` | 2,024 B |
| twapReference | `0x6670cA5cCC91820ab9c12228637D7186e6af5CCC` | 3,796 B |
| usdg | `0x0953ac821a5f07A39b02Ecf5faaEca0477f13986` | 1,698 B |
| nvda / tsla / spy / qqq / aapl | `0x98a7…101D` / `0xd74c…97d6` / `0xb7d5…ac1d` / `0xd5F4…f110` / `0xb5c3…9379` | 1,698 B each |
| Greeks / EverlastingMath / Funding / PoolHedging / PoolLayers | `0xA8f5…4A5d` / `0x82a9…e216` / `0x2159…0861` / `0x19fa…5B43` / `0x7e03…858c` | 2,137 / 2,081 / 951 / 10,054 / 5,681 B |

Artifact: `artifacts/onchain/verify_46630.json` (reproducible with
`python scripts/verify_onchain_deployments.py 46630`).

**The testnet deployment is real.** The register was not lying about the chain;
the page was wrong about itself.

## 3. Why the manager saw "Belum dideploy"

Two independent defects, both real:

1. **Stale bundle.** A build shipped before the address list was wired into
   `ContractsPage.tsx`. Those rows rendered the literal string `Belum dideploy`.
   Anyone opening that bundle sees "nothing is deployed" no matter what the chain
   says. Nothing on the page identified which build it was, so this could not be
   diagnosed from a screenshot.

2. **An RPC failure has no distinct state.** `https://rpc.mainnet.chain.robinhood.com`
   is unreachable from an Indonesian ISP: it answers `302` to
   `https://internetsehat.iconpln.net.id` (national block page), and its TLS chain
   was expired when `cast chain-id` tried it on 2026-11-20
   (`invalid peer certificate: Expired`). `explorer.testnet.chain.robinhood.com`
   serves an invalid CA (`ERR_CERT_AUTHORITY_INVALID` in Chrome). The testnet RPC
   itself is healthy: CORS `*`, answers chainId `0xb626` (46630) in ~0.3 s.
   Any page that collapses "could not reach the node" into "not deployed" tells a
   lie the moment the network is filtered — which is the default state for users on
   this ISP.

## 4. What was changed

| File | Change |
|---|---|
| `web/src/data/rpc.ts` | per-network endpoint list + fallback, `VITE_RPC_46630_EXTRA` / `VITE_RPC_4663_EXTRA` injection, expected chain id |
| `web/src/hooks/chain/useOnChainCode.ts` | batched JSON-RPC (`eth_chainId` + `eth_blockNumber` + `eth_getCode` per address) with endpoint fallback, 9 s timeout, per-endpoint attempt log, three states: `active` / `empty` / `unknown` |
| `web/src/pages/ContractsPage.tsx` | register now prints a chain-verified banner (chain id, block, N/N, timestamp, endpoint) and a per-address chip (`on-chain · 15.7 KB`); wrong-chain and RPC-unreachable get their own banners; capability table dated as a product statement; build stamp in the footer; testnet rows read `deployments/46630.json` first, `protocol.ts` only as fallback (one source of truth) |
| `web/vite.config.ts` | `__BUILD_STAMP__` = git commit + build time, so a screenshot is traceable |
| `scripts/verify_onchain_deployments.py` | CLI proof: `eth_getCode` batch with fallback, writes `artifacts/onchain/verify_<chainId>.json`, exit 1 on empty/unknown |
| `artifacts/onchain/verify_46630.json`, `verify_4663.json` | evidence: 20/20 active on 46630; 4663 UNREACHABLE from this network |

`unknown` is now a first-class state. The page can no longer render absence from a
failed read.

## 5. Verified behaviour (local build, Chromium against `vite preview`)

All four states were exercised, not just reasoned about:

| Forced condition | Rendered result |
|---|---|
| Testnet, untouched manifest | `Verified on chain. 13/13 alamat punya bytecode di chain 46630 · block 155,692,018 · dibaca 20/11/2026, 09.24.57 dari https://rpc.testnet.chain.robinhood.com`, every row chipped `on-chain · N KB` |
| `deployments/46630.json` engine temporarily pointed at `0x…dEaD` | `Chain menjawab: 1 alamat tanpa bytecode. … Alamat di bawah ini tidak boleh dipercaya sampai diperbaiki.` + rose chip on that row (12 active / 1 empty); manifest then restored and rebuilt |
| Mainnet tab on this ISP | `Chain tidak terjangkau dari jaringan ini. … ini masalah jaringan/RPC, bukan bukti kontrak belum dideploy.` + attempt line `…→ Failed to fetch (106ms)` |
| Local mock RPC answering chain 46630 while page expects 4663 | `Wrong chain. http://127.0.0.1:4899 answered chain 46630, expected 4663. …` |

`Belum dideploy` does not appear anywhere in the rendered page or in the final
bundle. The mock endpoint string is absent from the shipped `dist/`.

## 6. Still true, not fixed by a page change

These are product gaps, not UI bugs. They stay visible on purpose:

| Gap | What closing it actually takes |
|---|---|
| Spot hedging + TWAP disabled on testnet | live Uniswap V3 pool on 46630 with real liquidity, then `PriceGuard`/`PoolHedging` wired to it |
| Volatility oracle sigma set manually | signed vol-engine feed deployed + keeper running + staleness policy |
| Timelock owner is an EOA on testnet | deploy `TimelockController` on 46630, transfer ownership, verify delay + proposer/executor roles |
| Account abstraction inactive | bundler + paymaster deployment, EntryPoint wiring, session-key policy |
| Vaults / staking / buy-burn later-phase | `VaultRegistry` + `pool.setVaultHook`, token + governance decision by owner |

## 7. Open decision for the manager

The deployed Vercel build is not the build in this repo. Shipping this fix to
`arcum-f2tc.vercel.app` needs `vercel --prod` (or a push to the linked branch),
which is a production action and was not taken without an explicit go-ahead.