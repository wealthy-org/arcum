// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @dev Minimal ERC-4337 v0.7 surface. Declared locally instead of pulling `account-abstraction` as a dependency: the
/// deployed EntryPoint on chain 46630 is the canonical v0.7 singleton
/// (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`, 16,035 bytes of code verified 2026-11-20), so only the ABI shape is
/// needed, not the reference implementation.
struct PackedUserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    bytes32 accountGasLimits; // high 128: verificationGasLimit, low 128: callGasLimit
    uint256 preVerificationGas;
    bytes32 gasFees; // high 128: maxPriorityFeePerGas, low 128: maxFeePerGas
    bytes paymasterAndData;
    bytes signature;
}

interface IAccount {
    /// @return validationData packed authorizer (0x01) + validUntil (6 bytes) + validAfter (6 bytes)
    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        returns (uint256 validationData);
}

interface IPaymaster {
    enum PostOpMode {
        opSucceeded,
        opReverted,
        postOpReverted
    }

    function validatePaymasterUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 maxCost)
        external
        returns (bytes memory context, uint256 validationData);

    // ERC-4337 v0.7 added `actualUserOpFeePerGas`; the selector differs from v0.6, so the arity must match exactly.
    function postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost, uint256 actualUserOpFeePerGas)
        external;
}

interface IEntryPoint {
    function depositTo(address account) external payable;

    function balanceOf(address account) external view returns (uint256);

    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;

    function getNonce(address sender, uint192 key) external view returns (uint256 nonce);

    function getUserOpHash(PackedUserOperation calldata userOp) external view returns (bytes32);

    function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary) external;
}