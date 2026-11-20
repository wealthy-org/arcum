// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ArcumAccount} from "./ArcumAccount.sol";
import {IEntryPoint} from "./IEntryPoint.sol";

/// @title ArcumAccountFactory
/// @notice Deterministic counterfactual accounts: the address of an owner's account can be computed before it exists.
/// @dev CREATE2 with `keccak256(abi.encode(owner, userSalt))`, so the same owner can hold several accounts and a UI can
/// precompute the address for a deposit without a round trip.
contract ArcumAccountFactory {
    IEntryPoint public immutable entryPoint;

    event AccountCreated(address indexed account, address indexed owner, uint256 salt);

    error AccountAlreadyExists(address account);
    error InvalidParams();

    constructor(IEntryPoint entryPoint_) {
        if (address(entryPoint_) == address(0)) revert InvalidParams();
        entryPoint = entryPoint_;
    }

    function createAccount(address owner, uint256 salt) external returns (ArcumAccount account) {
        address predicted = getAddress(owner, salt);
        if (predicted.code.length != 0) revert AccountAlreadyExists(predicted);
        account = new ArcumAccount{salt: _salt(owner, salt)}(entryPoint, owner);
        emit AccountCreated(address(account), owner, salt);
    }

    function getAddress(address owner, uint256 salt) public view returns (address) {
        if (owner == address(0)) revert InvalidParams();
        bytes32 initCodeHash = keccak256(
            abi.encodePacked(type(ArcumAccount).creationCode, abi.encode(address(entryPoint), owner))
        );
        return address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), _salt(owner, salt), initCodeHash))))
        );
    }

    function _salt(address owner, uint256 salt) internal pure returns (bytes32) {
        return keccak256(abi.encode(owner, salt));
    }
}