# Handover signing pages

Static pages, served on the LAN, opened inside the MetaMask mobile app's built-in browser.
They exist because the accounts that hold the timelock roles and the Safe owner keys are on
someone's phone, and the chain has no working explorer or Safe Transaction Service.

| File | Purpose |
|---|---|
| `index.html` | Step 1 (schedule the handover batch) and step 2 (execute it 48 h later, then renounce the old roles). |
| `safe.html` | Step 3: one Safe transaction with two signatures that calls `acceptOwnership()` on VolOracle and KeeperTwapReference through MultiSend. |
| `config.js` | Generated data: addresses, the exact `scheduleBatch` / `executeBatch` calldata, the operation id, the role hashes for the renounce calls, and the gas ceiling. |
| `mock-provider-index.js` | Fake `window.ethereum` used to exercise `index.html` in a desktop browser without MetaMask. |
| `mock-provider-safe.js` | Same for `safe.html`; it compares the calldata the page builds against `cast` output and records `window.__gthMatch`. |

## What is generated, and how

The calldata is not hand-written. It came from `cast calldata`, was decoded again with
`cast decode-calldata` to confirm the six actions, and the operation id is the one
`contracts/script/SafeHandover.s.sol` prints from `hashOperationBatch` on the live chain.

Re-derive the operation id at any time:

```sh
cd contracts
SAFE_ADDRESS=0xf2EFC16D920175C8805fCF21DcD0c420691b60db \
  forge script script/SafeHandover.s.sol:SafeHandover --rpc-url http://127.0.0.1:8547
```

## Verifying the pages without a phone

Run the LAN server, then in a desktop Chromium launch with the mock injected:

```
agent-browser --init-script app/ops/handover/mock-provider-safe.js open http://127.0.0.1:8899/safe.html
```

`window.__gthMatch === true` means the page's EIP-712 arguments, ABI-encoded, are byte-identical
to what `cast` produced for `getTransactionHash`. That is the check that matters: a Safe
signature over a slightly different encoding would look valid in MetaMask and revert on chain.

## Safety

No private key, seed phrase, or RPC endpoint lives in this folder. The pages cannot sign
anything by themselves; every transaction is approved by hand in MetaMask. Nothing here is
served beyond the local subnet.
