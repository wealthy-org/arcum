// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @notice ABI declarations for the parts of Gnosis Safe v1.3.0 this repo uses, plus one
 *         helper. Nothing here reimplements Safe: the singleton, the proxy factory and the
 *         fallback handler are already deployed on chain 46630 (codesize 22.958 / 3.774 /
 *         5.637) and are called by address.
 *
 * Why ABI copies and not the npm package: the repo has no Safe dependency, and adding one to
 * read a threshold and collect two signatures is heavier than the interfaces below.
 */

interface ISafeProxyFactory {
    function createProxyWithNonce(address singleton, bytes calldata initializer, uint256 saltNonce)
        external
        returns (address proxy);
}

interface ISafeSetup {
    function setup(
        address[] calldata _owners,
        uint256 _threshold,
        address to,
        bytes calldata data,
        address fallbackHandler,
        address paymentToken,
        uint256 payment,
        address payable paymentReceiver
    ) external;

    function getThreshold() external view returns (uint256);

    function getOwners() external view returns (address[] memory);

    function nonce() external view returns (uint256);

    function execTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address refundReceiver,
        bytes calldata signatures
    ) external payable returns (bool success);

    function enableModule(address module) external;

    function isModuleEnabled(address module) external view returns (bool);
}

library SafeLibrary {
    /// @dev Safe requires strictly ascending owner order; it reverts on duplicates.
    function sortAddresses(address[] memory items) internal pure returns (address[] memory) {
        uint256 n = items.length;
        for (uint256 i = 1; i < n; i++) {
            address key = items[i];
            uint256 j = i;
            while (j > 0 && uint160(items[j - 1]) > uint160(key)) {
                items[j] = items[j - 1];
                j--;
            }
            items[j] = key;
        }
        for (uint256 i = 1; i < n; i++) {
            require(items[i - 1] != items[i], "SafeLibrary: duplicate owner");
        }
        return items;
    }
}
