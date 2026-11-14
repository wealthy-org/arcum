import { parseAbi } from 'viem';
export {
  ArcumEngineAbi,
  WriterPoolAbi,
  AgentRouterAbi,
  SeriesRegistryAbi,
  PriceGuardAbi,
} from './generated';

export const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function mint(address to, uint256 amount) external',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
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
  'function vMark(bytes32 id) external view returns (uint256 vWad, uint256 payoffWad, uint64 sigmaBps, uint8 session)',
  'function cancelQueued(uint256 ticket) external',
  'event Bought(bytes32 indexed id, address indexed account, address recipient, uint256 units, uint256 tokens, uint256 usdgPaid, uint256 vMarkWad, uint64 sigmaBps, uint8 session)',
  'event Sold(bytes32 indexed id, address indexed account, address recipient, uint256 units, uint256 tokens, uint256 usdgReceived, uint256 vMarkWad, uint64 sigmaBps, uint8 session)',
  'event ShieldBought(address indexed account, address indexed stock, bytes32 indexed id, uint256 tokenUnits, uint256 usdgPaid)',
  'event SellQueued(uint256 indexed ticket, bytes32 indexed id, address indexed seller, address recipient, uint128 tokens, uint64 queuedAt)',
  'error ShieldExceedsHolding(uint256 held, uint256 requested)',
  'error SeriesNotBuyable(bytes32 id)',
  'error BelowMinimum()',
  'error Expired()',
  'error Slippage(uint256 got, uint256 limit)',
]);

export const WRITER_POOL_ABI = parseAbi([
  'function deposit(uint256 assets, address receiver) external returns (uint256 shares)',
  'function requestWithdraw(uint256 shares) external returns (uint256 ticket)',
  'function claim(uint256 ticket) external returns (uint256 usdg)',
  'function nav() external view returns (int256)',
  'function navPerShare() external view returns (uint256)',
  'function totalAssets() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function balanceOf(address account) external view returns (uint256)',
  'function unlockTime(address user) external view returns (uint256)',
  'function maxDeposit(address user) external view returns (uint256)',
  'function capsFor(uint256 liabilityWad) external view returns (uint256 maxOutstandingWad, uint256 maxPerNameWad)',
  'function maxOutstandingBps() external view returns (uint16)',
  'function maxPerNameBps() external view returns (uint16)',
  'function lockSeconds() external view returns (uint32)',
  'function ticketOf(uint256 ticket) external view returns (address owner, uint256 shares, uint64 claimableAt)',
  'function CLAIM_WINDOW() external view returns (uint256)',
  'function publicDeposits() external view returns (bool)',
  'event WithdrawalQueued(address indexed owner, uint256 indexed ticket, uint256 shares, uint64 claimableAt)',
  'event WithdrawalClaimed(address indexed owner, uint256 indexed ticket, uint256 usdg)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
]);

export const AGENT_ROUTER_ABI = parseAbi([
  'function setPolicy(address agent, uint128 budgetUsdg, uint128 maxPerTradeUsdg, uint64 expiresAt, bool canSell, bool canShield, address[] allowedStocks) external',
  'function revoke(address agent) external',
  'function policyOf(address owner, address agent) external view returns ((address agent, uint128 budgetUsdg, uint128 spentUsdg, uint128 maxPerTradeUsdg, uint64 expiresAt, bool canSell, bool canShield, bool revoked))',
  'function remainingBudget(address owner, address agent) external view returns (uint256)',
  'function allowedStocks(address owner, address agent) external view returns (address[])',
  'function buyFor(address owner, bytes32 id, uint128 units, uint128 maxCostUsdg, uint64 deadline) external returns (uint256 costUsdg, uint256 tokensMinted)',
  'function sellFor(address owner, bytes32 id, uint128 tokens, uint128 minProceedsUsdg, uint64 deadline) external returns (uint256 proceedsUsdg)',
  'function shieldFor(address owner, address stock, uint128 tokenUnits, uint16 pctBelowBps, uint128 maxCostUsdg, uint64 deadline) external returns (bytes32 id, uint256 costUsdg)',
  'event PolicySet(address indexed owner, address indexed agent, uint128 budgetUsdg, uint128 maxPerTradeUsdg, uint64 expiresAt, bool canSell, bool canShield)',
  'event PolicyRevoked(address indexed owner, address indexed agent)',
  'event AgentTrade(address indexed owner, address indexed agent, bytes32 indexed seriesId, bool isBuy, uint256 usdg)',
]);

export const SERIES_REGISTRY_ABI = parseAbi([
  'function seriesCount() external view returns (uint256)',
  'function seriesIdAt(uint256 index) external view returns (bytes32)',
  'function seriesOf(bytes32 id) external view returns ((address stock, bool isCall, uint8 speed, uint32 tauSeconds, uint128 strike, address token, uint128 norm, uint64 lastAccrual, uint64 listedAt, bool buyable, bool archived))',
  'function idOf(address stock, bool isCall, uint128 strike, uint32 tauSeconds) external view returns (bytes32)',
  'event SeriesListed(bytes32 indexed id, address indexed stock, bool isCall, uint8 speed, uint128 strike, address token)',
]);

export const PRICE_GUARD_ABI = parseAbi([
  'function read(address stock) external view returns ((uint256 s, uint8 session, bool fresh, bool buysPaused, uint256 updatedAt))',
  'function readLite(address stock) external view returns ((uint256 s, uint8 session, bool fresh, bool buysPaused, uint256 updatedAt))',
  'function lastGoodPrice(address stock) external view returns (uint256 s, uint256 at)',
]);
