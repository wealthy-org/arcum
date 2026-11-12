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
  'function sell(bytes32 id, uint128 units, uint128 minPayoutUsdg, uint64 deadline, address recipient) external returns (uint256 payoutUsdg)',
  'function quote(bytes32 id, uint256 units, bool isBuy) external view returns ((bool buyable, uint8 session, uint256 sWad, uint256 vMarkWad, uint256 sigmaBps, uint256 usdg, uint256 feeUsdg, uint256 dailyCostUsdg, uint256 breakevenWad, uint16 spreadBps) q)',
]);

export const WRITER_POOL_ABI = parseAbi([
  'function deposit(uint256 assets, address receiver) external returns (uint256 shares)',
  'function requestWithdraw(uint256 shares) external returns (uint256 ticket)',
  'function claim(uint256 ticket) external returns (uint256 assets)',
  'function totalAssets() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
]);
