#!/usr/bin/env bash
# End-to-end proof that script/DeployProduction.s.sol works, WITHOUT touching mainnet.
# Starts a local anvil node, deploys a 6-decimal settlement token + a fake AggregatorV3 feed per stock,
# runs the production script with --broadcast, then asserts the deployed stack reads the feed.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"

RPC=${RPC:-http://127.0.0.1:8545}
PK=${PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80} # anvil account 0
DEPLOYER=${DEPLOYER:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}
OWNER=${OWNER:-0x000000000000000000000000000000000000bEEF}
STRIKE=${STRIKE:-140}

cleanup() { [[ -n "${ANVIL_PID:-}" ]] && kill "$ANVIL_PID" 2>/dev/null || true; }
trap cleanup EXIT

pick() { python -c "import re,sys;print(re.search(r'Deployed to: (0x[0-9a-fA-F]{40})',sys.stdin.read()).group(1))"; }

if ! cast chain-id --rpc-url "$RPC" >/dev/null 2>&1; then
  echo "starting anvil..."
  anvil --port 8545 --silent >/tmp/arcum-anvil.log 2>&1 &
  ANVIL_PID=$!
  for _ in $(seq 1 40); do cast chain-id --rpc-url "$RPC" >/dev/null 2>&1 && break; sleep 0.25; done
fi

echo "== chain id: $(cast chain-id --rpc-url "$RPC")"
USDG=$(forge create test/DeployProduction.t.sol:FakeUSDG --private-key "$PK" --rpc-url "$RPC" --broadcast --constructor-args 6 2>&1 | pick)
STOCK=$(forge create test/DeployProduction.t.sol:FakeStock --private-key "$PK" --rpc-url "$RPC" --broadcast 2>&1 | pick)
FEED=$(forge create test/DeployProduction.t.sol:FakeFeed --private-key "$PK" --rpc-url "$RPC" --broadcast --constructor-args 8 14250000000 2>&1 | pick)
echo "USDG=$USDG STOCK=$STOCK FEED=$FEED"

echo "== feed sanity: $(cast call "$FEED" 'latestRoundData()(uint80,int256,uint256,uint256,uint80)' --rpc-url "$RPC" | tr '\n' ' ')"

export PRIVATE_KEY="$PK" USDG_ADDRESS="$USDG" OWNER_ADDRESS="$OWNER" \
  STOCK_SYMBOLS=NVDA STOCK_NVDA="$STOCK" FEED_NVDA="$FEED" \
  SERIES_SPECS="NVDA:call:${STRIKE}:86400" TWAP_BAND_BPS=200

echo "== running DeployProduction (broadcast)"
forge script script/DeployProduction.s.sol:DeployProduction --rpc-url "$RPC" --broadcast 2>&1 | tail -25

MANIFEST="../deployments/$(cast chain-id --rpc-url "$RPC")-production.json"
echo "== manifest: $MANIFEST"
python - "$MANIFEST" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
for k in ("chainId","usdg","priceGuard","seriesRegistry","writerPoolProxy","engineProxy","reserve","feeRouter","agentRouter","owner"):
    print(f"  {k}: {d.get(k)}")
PY

GUARD=$(python -c "import json;print(json.load(open('$MANIFEST'))['priceGuard'])")
REGISTRY=$(python -c "import json;print(json.load(open('$MANIFEST'))['seriesRegistry'])")
ENGINE=$(python -c "import json;print(json.load(open('$MANIFEST'))['engineProxy'])")

echo "== on-chain assertions"
read_price() { cast call "$GUARD" 'read(address)((uint256,uint8,bool,bool,uint256))' "$1" --rpc-url "$RPC" | tr '\n' ' '; }
PRICE=$(read_price "$STOCK")
echo "  guard.read(stock) = $PRICE"
echo "  guard.owner()          = $(cast call "$GUARD" 'owner()(address)' --rpc-url "$RPC")"
echo "  guard.pendingOwner()   = $(cast call "$GUARD" 'pendingOwner()(address)' --rpc-url "$RPC")"
echo "  registry.owner()       = $(cast call "$REGISTRY" 'owner()(address)' --rpc-url "$RPC")"
echo "  engine.owner()         = $(cast call "$ENGINE" 'owner()(address)' --rpc-url "$RPC")"
echo "  registry.allowedStock  = $(cast call "$REGISTRY" 'allowedStock(address)(bool)' "$STOCK" --rpc-url "$RPC")"

python - "$PRICE" <<'PY'
import re, sys
parts = [p.strip() for p in sys.argv[1].strip().strip("()").split(",")]
price = int(re.match(r"\d+", parts[0]).group())
session = int(re.match(r"\d+", parts[1]).group())
fresh = parts[2].startswith("true")
paused = parts[3].startswith("true")
session_name = {0: "REGULAR", 1: "EXTENDED", 2: "CLOSED", 3: "UNKNOWN", 4: "HALTED"}.get(session, "?")
ok = price == int(142.5 * 10**18) and fresh and not paused
print(f"  price=${price/1e18} session={session_name} fresh={fresh} buysPaused={paused}")
print("  RESULT:", "PASS - production guard reads the real feed" if ok else "FAIL")
sys.exit(0 if ok else 1)
PY
