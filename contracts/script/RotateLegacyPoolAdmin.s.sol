// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";

interface IAccessControlLike {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
}

/**
 * @notice Moves `DEFAULT_ADMIN_ROLE` on the legacy 46630 `writerPoolProxy` off the leaked
 *         staging key (`0x1B4Faa13…3E45`) and onto the timelock.
 *
 * Why this exists: `RotateLegacyOwner` only covers `Ownable` contracts. The writer pool is a
 * UUPS proxy using `AccessControlUpgradeable`, so it has no `owner()` and no ERC-1967 admin
 * slot (`0xb5312768…6103` reads zero, which is normal for UUPS). Its upgrade authority is
 * `DEFAULT_ADMIN_ROLE` held in proxy storage — and on 2026-11-20 that role was still held by
 * the leaked key. Anyone with it can `upgradeToAndCall` to arbitrary logic and take the pool's
 * assets. The empty admin slot is not protection; it is the wrong slot to look at.
 *
 * Order matters: grant first, then renounce. If this script is interrupted between the two,
 * the timelock still has admin and the key still has admin — recoverable. The reverse order
 * could lock the role out entirely.
 *
 * Run with `PRIVATE_KEY` set to the current admin key (the leaked staging key). That is
 * acceptable for a testnet handover and nothing else; `DeployProduction.s.sol` refuses it.
 *
 * After this runs, upgrading the pool requires a 48-hour timelock proposal.
 *
 * Usage:
 *   forge script script/RotateLegacyPoolAdmin.s.sol:RotateLegacyPoolAdmin \
 *     --rpc-url $RPC --broadcast --slow
 *
 * Simulation only (no broadcast) prints the same plan and changes nothing.
 */
contract RotateLegacyPoolAdmin is Script {
    bytes32 internal constant DEFAULT_ADMIN_ROLE = bytes32(0);

    function run() external {
        address pool = vm.envOr(
            "LEGACY_WRITER_POOL",
            address(0x1F79F6D8eFB739c270Ec7957Fff0754151eF550F)
        );
        address timelock = vm.envOr(
            "TL_ADDRESS",
            address(0x249ACeb7d446F5f0375e6E6b6F3b88f88e399E6b)
        );
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address signer = vm.addr(pk);

        console2.log("signer  ", signer);
        console2.log("timelock", timelock);
        console2.log("pool    ", pool);

        require(pool.code.length > 0, "pool has no code");
        require(timelock.code.length > 0, "timelock has no code");

        IAccessControlLike ac = IAccessControlLike(pool);
        bool signerIsAdmin = ac.hasRole(DEFAULT_ADMIN_ROLE, signer);
        bool timelockIsAdmin = ac.hasRole(DEFAULT_ADMIN_ROLE, timelock);

        console2.log("[before] signer is admin  ", signerIsAdmin);
        console2.log("[before] timelock is admin", timelockIsAdmin);

        if (!signerIsAdmin && !timelockIsAdmin) {
            // Neither of us holds the role: the pool is administered by someone else, and this
            // script must not pretend otherwise.
            revert("signer is not DEFAULT_ADMIN_ROLE on this pool");
        }
        if (timelockIsAdmin && !signerIsAdmin) {
            console2.log("[done] already handed over; nothing to do");
            return;
        }

        vm.startBroadcast(pk);
        if (!timelockIsAdmin) {
            ac.grantRole(DEFAULT_ADMIN_ROLE, timelock);
            console2.log("[set] grant DEFAULT_ADMIN_ROLE -> timelock");
        } else {
            console2.log("[skip] timelock already admin");
        }
        // Only now drop our own admin. `renounceRole` in OZ v5 requires account == msg.sender.
        ac.renounceRole(DEFAULT_ADMIN_ROLE, signer);
        console2.log("[set] renounce DEFAULT_ADMIN_ROLE from signer");
        vm.stopBroadcast();

        // Fail loudly rather than report a half-done handover as success.
        require(ac.hasRole(DEFAULT_ADMIN_ROLE, timelock), "post: timelock is not admin");
        require(!ac.hasRole(DEFAULT_ADMIN_ROLE, signer), "post: signer still admin");
        console2.log("[after] timelock holds DEFAULT_ADMIN_ROLE, signer does not");
    }
}