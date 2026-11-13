import { parseAbi } from 'viem';

export const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function mint(address to, uint256 amount) external',
]);

export const ARCUM_ENGINE_ABI = parseAbi([
  'function buy(bytes32 id, uint128 units, uint128 maxCostUsdg, uint64 deadline, address recipient) external returns (uint256 costUsdg, uint256 tokensMinted)',
  'function sell(bytes32 id, uint128 tokens, uint128 minProceedsUsdg, uint64 deadline, address recipient) external returns (uint256 proceedsUsdg)',
  'function shield(address stockToken, uint128 tokenUnits, uint16 strikePctBelowBps, uint128 maxCostUsdg, uint64 deadline) external returns (bytes32 id, uint256 costUsdg)',
  'function quote(bytes32 id, uint256 units, bool isBuy) external view returns ((uint256 usdg, uint256 vMarkWad, uint256 spreadBps, uint256 feeUsdg, uint256 dailyCostUsdg, uint256 breakevenWad, uint64 sigmaBps, uint8 session, bool buyable) q)',
  'function totalLiability() external view returns (uint256)',
  'function bookValue() external view returns (uint256)',
  'function accrue(bytes32 id) external',
  'function accrueMany(bytes32[] ids) external',
  'function shieldList(address stock) external view returns (bytes32[])',
]);

export const WRITER_POOL_ABI = parseAbi([
  'function deposit(uint256 assets, address receiver) external returns (uint256 shares)',
  'function requestWithdraw(uint256 shares) external returns (uint256 ticket)',
  'function claim(uint256 ticket) external returns (uint256 assets)',
  'function nav() external view returns (int256)',
  'function navPerShare() external view returns (uint256)',
  'function totalAssets() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function unlockTime(address user) external view returns (uint256)',
  'function maxDeposit(address user) external view returns (uint256)',
  'function capsFor(uint256 liabilityWad) external view returns (uint256 maxOutstandingWad, uint256 maxPerNameWad)',
]);

export const AGENT_ROUTER_ABI = parseAbi([
  'function setPolicy(address agent, uint128 budgetUsdg, uint128 maxPerTradeUsdg, uint64 expiresAt, bool canSell, bool canShield, address[] allowedStocks) external',
  'function revoke(address agent) external',
  'function policyOf(address owner, address agent) external view returns ((uint128 budgetUsdg, uint128 maxPerTradeUsdg, uint64 expiresAt, bool canSell, bool canShield, uint128 spentUsdg, bool revoked))',
  'function remainingBudget(address owner, address agent) external view returns (uint256)',
  'function allowedStocks(address owner, address agent) external view returns (address[])',
]);

export const SERIES_REGISTRY_ABI = parseAbi([
  'function seriesCount() external view returns (uint256)',
  'function seriesIdAt(uint256 index) external view returns (bytes32)',
  'function seriesOf(bytes32 id) external view returns ((address stock, bool isCall, uint8 speed, uint32 tauSeconds, uint128 strike, address token, uint128 norm, uint64 lastAccrual, uint64 listedAt, bool buyable, bool archived))',
  'function idOf(address stock, bool isCall, uint128 strike, uint32 tauSeconds) external view returns (bytes32)',
]);

export const PRICE_GUARD_ABI = parseAbi([
  'function read(address stock) external view returns ((uint256 s, uint8 session, bool fresh, bool buysPaused, uint256 updatedAt))',
  'function readLite(address stock) external view returns ((uint256 s, uint8 session, bool fresh, bool buysPaused, uint256 updatedAt))',
  'function lastGoodPrice(address stock) external view returns (uint256 s, uint256 at)',
]);
