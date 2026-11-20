// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IAccount, IEntryPoint, PackedUserOperation} from "./IEntryPoint.sol";

/// @title ArcumAccount
/// @notice Minimal ERC-4337 v0.7 smart account: one owner key, execute/executeBatch, no upgradeability.
/// @dev Why not an existing implementation: the EntryPoint on 46630 is canonical, but pulling a full account stack
/// (SimpleAccount + proxy factory + upgradeable storage layout) would add surface nobody here can audit in one sitting.
/// This account is 120 lines, holds no upgrade path, and its entire authority is "the owner's ECDSA signature over the
/// EntryPoint's userOpHash". Anything the protocol needs beyond that belongs in the calldata, not in the account.
contract ArcumAccount is IAccount {
    using MessageHashUtils for bytes32;

    IEntryPoint public immutable entryPoint;
    address public owner;

    event Executed(address indexed dest, uint256 value, bytes data);
    event OwnerChanged(address indexed previous, address indexed next);

    error NotEntryPoint(address caller);
    error NotOwner(address caller);
    error InvalidOwner();
    error CallFailed(bytes reason);

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) revert NotEntryPoint(msg.sender);
        _;
    }

    /// @dev The account itself counts as an owner so a signed userOp can rotate the key by self-call
    /// (`execute(address(this), 0, setOwner(next))`). Without this the only way to rotate would be a transaction from the
    /// old key, which defeats the point of an account that is driven by userOperations.
    modifier onlyOwnerOrSelf() {
        if (msg.sender != owner && msg.sender != address(this)) revert NotOwner(msg.sender);
        _;
    }

    constructor(IEntryPoint entryPoint_, address owner_) {
        if (address(entryPoint_) == address(0) || owner_ == address(0)) revert InvalidOwner();
        entryPoint = entryPoint_;
        owner = owner_;
        emit OwnerChanged(address(0), owner_);
    }

    receive() external payable {}

    /// @inheritdoc IAccount
    /// @dev Pays the EntryPoint's missing prefund, then validates the owner signature. A wrong signature returns
    /// `SIG_VALIDATION_FAILED` (1) instead of reverting, which is what the EntryPoint expects.
    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        onlyEntryPoint
        returns (uint256 validationData)
    {
        if (missingAccountFunds > 0) {
            (bool paid,) = payable(msg.sender).call{value: missingAccountFunds}("");
            paid; // a failed prefund surfaces as a validation failure at the EntryPoint, not as a revert here
        }

        if (userOp.signature.length != 65) return 1;
        address recovered = ECDSA.recover(userOpHash.toEthSignedMessageHash(), userOp.signature);
        return recovered == owner ? 0 : 1;
    }

    /// @notice Call one target. Only the EntryPoint may drive the account.
    function execute(address dest, uint256 value, bytes calldata func) external onlyEntryPoint {
        _call(dest, value, func);
        emit Executed(dest, value, func);
    }

    /// @notice Call several targets atomically.
    function executeBatch(address[] calldata dest, uint256[] calldata value, bytes[] calldata func)
        external
        onlyEntryPoint
    {
        if (dest.length != func.length || dest.length != value.length) revert CallFailed("length");
        for (uint256 i = 0; i < dest.length; ++i) {
            _call(dest[i], value[i], func[i]);
            emit Executed(dest[i], value[i], func[i]);
        }
    }

    /// @notice Rotate the signer. Usually driven by the account itself through an EntryPoint userOp.
    function setOwner(address next) external onlyOwnerOrSelf {
        if (next == address(0)) revert InvalidOwner();
        emit OwnerChanged(owner, next);
        owner = next;
    }

    function _call(address dest, uint256 value, bytes calldata func) private {
        (bool ok, bytes memory reason) = dest.call{value: value}(func);
        if (!ok) revert CallFailed(reason);
    }
}