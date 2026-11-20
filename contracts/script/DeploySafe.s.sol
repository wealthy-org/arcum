// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {ISafeSetup, ISafeProxyFactory, SafeLibrary} from "./safe/SafeMinimal.sol";

/**
 * @notice Deploys a real 2-of-2 Gnosis Safe v1.3.0 on Robinhood Chain testnet (46630) by
 *         calling the canonical SafeProxyFactory that is already live there.
 *
 * Why not app.safe.global: the Safe web app needs the Safe Transaction Service and the block
 * explorer, and this chain's explorer certificate is expired. Signatures are collected
 * off-chain by `script/SafeSignatureCollector.s.sol`, which needs no service at all.
 *
 * Reusing the deployed factory/singleton means this is a real Safe: signature checks, nonce
 * handling and `execTransaction` all come from canonical Safe code, not a local copy.
 *
 * Env:
 *   SIGNER_1, SIGNER_2    the two owner addresses (public addresses only — this script needs
 *                         no private key for them; the deployer pays the gas)
 *   SAFE_PROXY_FACTORY    default 0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2 (v1.3.0, live)
 *   SAFE_SINGLETON        default 0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552 (v1.3.0, live)
 *   SAFE_FALLBACK_HANDLER default 0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99 (live)
 *   SAFE_SALT_NONCE       default 20261120
 *
 * Usage:
 *   forge script script/DeploySafe.s.sol:DeploySafe --rpc-url $RPC --broadcast --slow
 *
 * Deterministic: the same owners + salt produce the same proxy address, so a re-run reverts
 * ("create2 call failed") instead of silently creating a second Safe for the same signers.
 */
contract DeploySafe is Script {
    address internal constant SAFE_PROXY_FACTORY = 0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2;
    address internal constant SAFE_SINGLETON = 0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552;
    address internal constant SAFE_FALLBACK_HANDLER = 0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99;

    function run() external returns (address proxy) {
        address[] memory owners = new address[](2);
        owners[0] = vm.envAddress("SIGNER_1");
        owners[1] = vm.envAddress("SIGNER_2");
        require(owners[0] != address(0) && owners[1] != address(0), "zero signer");
        owners = SafeLibrary.sortAddresses(owners);

        address factory = vm.envOr("SAFE_PROXY_FACTORY", SAFE_PROXY_FACTORY);
        address singleton = vm.envOr("SAFE_SINGLETON", SAFE_SINGLETON);
        address handler = vm.envOr("SAFE_FALLBACK_HANDLER", SAFE_FALLBACK_HANDLER);
        uint256 saltNonce = vm.envOr("SAFE_SALT_NONCE", uint256(20261120));

        console2.log("factory  ", factory);
        console2.log("singleton", singleton);
        console2.log("handler  ", handler);
        console2.log("owner[0] ", owners[0]);
        console2.log("owner[1] ", owners[1]);

        bytes memory initData = abi.encodeWithSelector(
            ISafeSetup.setup.selector,
            owners,
            uint256(2),
            address(0),
            bytes(""),
            handler,
            address(0),
            uint256(0),
            address(0)
        );

        uint256 pk = vm.envUint("PRIVATE_KEY");
        console2.log("deployer ", vm.addr(pk));

        vm.startBroadcast(pk);
        proxy = ISafeProxyFactory(factory).createProxyWithNonce(singleton, initData, saltNonce);
        vm.stopBroadcast();

        console2.log("");
        console2.log("SAFE_ADDRESS", proxy);
        console2.log("threshold   ", ISafeSetup(proxy).getThreshold());
        address[] memory actual = ISafeSetup(proxy).getOwners();
        console2.log("owners[0]   ", actual[0]);
        console2.log("owners[1]   ", actual[1]);
        console2.log("nonce       ", ISafeSetup(proxy).nonce());

        require(ISafeSetup(proxy).getThreshold() == 2, "threshold != 2");
        require(actual.length == 2, "owners != 2");
        require(actual[0] == owners[0] && actual[1] == owners[1], "owners mismatch");
    }
}
