// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPaymaster, IEntryPoint, PackedUserOperation} from "./IEntryPoint.sol";

/// @title ArcumPaymaster
/// @notice Deposit-based gas sponsorship with an explicit per-account budget, so "account abstraction works" does not
/// silently mean "anyone's userOperation is paid for by the protocol".
/// @dev Model:
///  - the protocol funds the EntryPoint deposit (`deposit()`),
///  - the owner grants each account a budget denominated in wei of that deposit (`setBudget`),
///  - validation rejects ops whose worst-case cost exceeds the remaining budget,
///  - `postOp` charges the actual cost, so unused gas is not burned from the budget.
///
/// No signature-based sponsorship, no token payment, no unstaked relay: a sender that has budget is sponsored, a sender
/// that does not is rejected. Sponsorship is therefore an explicit allowlist decision, not a public faucet.
contract ArcumPaymaster is IPaymaster, Ownable {
    IEntryPoint public immutable entryPoint;

    /// @notice Remaining sponsorship budget per account, in wei of the EntryPoint deposit.
    mapping(address => uint256) public budgetOf;
    /// @notice Total wei charged through this paymaster since deployment (monotonic, for dashboards).
    uint256 public totalSponsored;

    event BudgetSet(address indexed account, uint256 budget);
    event Sponsored(address indexed account, uint256 cost);
    event DepositFunded(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    error NotEntryPoint(address caller);
    error InvalidParams();
    error BudgetExceeded(address account, uint256 required, uint256 available);

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) revert NotEntryPoint(msg.sender);
        _;
    }

    constructor(IEntryPoint entryPoint_) Ownable(msg.sender) {
        if (address(entryPoint_) == address(0)) revert InvalidParams();
        entryPoint = entryPoint_;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    /// @notice Fund the EntryPoint deposit that payouts are drawn from.
    function deposit() external payable onlyOwner {
        if (msg.value == 0) revert InvalidParams();
        entryPoint.depositTo{value: msg.value}(address(this));
        emit DepositFunded(msg.sender, msg.value);
    }

    /// @notice Grant (or shrink) an account's sponsorship budget in wei. Set 0 to revoke.
    function setBudget(address account, uint256 budget) external onlyOwner {
        if (account == address(0)) revert InvalidParams();
        budgetOf[account] = budget;
        emit BudgetSet(account, budget);
    }

    /// @notice Withdraw unused deposit back to the owner. Only what remains after all budgets could be spent is safe
    /// to move, so that responsibility stays explicit with the owner.
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0) || amount == 0) revert InvalidParams();
        entryPoint.withdrawTo(to, amount);
        emit Withdrawn(to, amount);
    }

    /// @notice EntryPoint deposit still available to this paymaster.
    function depositBalance() external view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    // ---------------------------------------------------------------------
    // ERC-4337
    // ---------------------------------------------------------------------

    /// @inheritdoc IPaymaster
    function validatePaymasterUserOp(PackedUserOperation calldata userOp, bytes32, uint256 maxCost)
        external
        view
        override
        returns (bytes memory context, uint256 validationData)
    {
        // `view` is legal for this override: no state is touched at validation time, budgets are only consumed in
        // postOp. A reverting validation surfaces as AA33 at the EntryPoint, which is the behaviour we want.
        uint256 budget = budgetOf[userOp.sender];
        if (budget < maxCost) revert BudgetExceeded(userOp.sender, maxCost, budget);
        return (abi.encode(userOp.sender, maxCost), 0);
    }

    /// @inheritdoc IPaymaster
    function postOp(PostOpMode, bytes calldata context, uint256 actualGasCost, uint256) external override onlyEntryPoint {
        (address account, uint256 maxCost) = abi.decode(context, (address, uint256));
        uint256 budget = budgetOf[account];
        uint256 charge = actualGasCost > budget ? budget : actualGasCost;
        // Never charge more than what validation approved.
        if (charge > maxCost) charge = maxCost;
        unchecked {
            budgetOf[account] = budget - charge;
        }
        totalSponsored += charge;
        emit Sponsored(account, charge);
    }

    receive() external payable {}
}