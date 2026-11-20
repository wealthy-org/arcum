// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";

interface IOwnableLike {
    function owner() external view returns (address);
    function transferOwnership(address newOwner) external;
}

interface IAccessControlLike {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
}

/**
 * @notice The two legacy 46630 contracts the earlier passes missed:
 *         `feeRouter` (plain `Ownable`) and `reserve` (`AccessControl` with
 *         `setParams` behind `DEFAULT_ADMIN_ROLE`).
 *
 * Why they were missed: `RotateLegacyOwner` covered the three `Ownable` contracts named
 * in that script, and `RotateLegacyPoolAdmin` covered the UUPS writer pool. Neither list
 * included the fee router or the reserve, and both still had the leaked staging key as
 * owner / `DEFAULT_ADMIN_ROLE` when checked on 2026-11-20.
 *
 * Order for the role: grant to the timelock first, renounce from the signer second. The
 * reverse can lock the role out with nobody able to grant it back.
 *
 * Run with `PRIVATE_KEY` set to the current owner/admin key (the leaked staging key).
 *
 * Usage:
 *   forge script script/RotateLegacyRemainder.s.sol:RotateLegacyRemainder \
 *     --rpc-url $RPC --broadcast --slow
 *
 * Simulation only (no broadcast) prints the same plan and changes nothing. Re-running is a
 * no-op once the timelock holds everything.
 */
contract RotateLegacyRemainder is Script {
    bytes32 internal constant DEFAULT_ADMIN_ROLE = bytes32(0);

    function run() external {
        address feeRouter = vm.envOr(
            "LEGACY_FEE_ROUTER",
            address(0x3cd28517B56dCF6dBf7c405eF24184b1CF41f968)
        );
        address reserve = vm.envOr(
            "LEGACY_RESERVE",
            address(0x607cdaff55Aa86B03C3EC9075828fdbbEC879B2d)
        );
        address timelock = vm.envOr(
            "TL_ADDRESS",
            address(0x249ACeb7d446F5f0375e6E6b6F3b88f88e399E6b)
        );
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address signer = vm.addr(pk);

        console2.log("signer   ", signer);
        console2.log("timelock ", timelock);
        console2.log("feeRouter", feeRouter);
        console2.log("reserve  ", reserve);

        require(timelock.code.length > 0, "timelock has no code");

        IOwnableLike fr = IOwnableLike(feeRouter);
        IAccessControlLike rs = IAccessControlLike(reserve);

        address frOwner = fr.owner();
        bool signerIsReserveAdmin = rs.hasRole(DEFAULT_ADMIN_ROLE, signer);
        bool timelockIsReserveAdmin = rs.hasRole(DEFAULT_ADMIN_ROLE, timelock);

        console2.log("[before] feeRouter.owner       ", frOwner);
        console2.log("[before] signer is reserve admin ", signerIsReserveAdmin);
        console2.log("[before] timelock is reserve admin", timelockIsReserveAdmin);

        require(frOwner == signer, "feeRouter owner is not the signer");
        require(signerIsReserveAdmin, "signer is not DEFAULT_ADMIN_ROLE on reserve");

        vm.startBroadcast(pk);
        fr.transferOwnership(timelock);
        console2.log("[set] feeRouter.owner -> timelock");

        if (!timelockIsReserveAdmin) {
            rs.grantRole(DEFAULT_ADMIN_ROLE, timelock);
            console2.log("[set] grant DEFAULT_ADMIN_ROLE -> timelock (reserve)");
        } else {
            console2.log("[skip] timelock already admin on reserve");
        }
        rs.renounceRole(DEFAULT_ADMIN_ROLE, signer);
        console2.log("[set] renounce DEFAULT_ADMIN_ROLE from signer (reserve)");
        vm.stopBroadcast();

        // Fail loudly rather than report a half-done handover as success.
        require(fr.owner() == timelock, "post: feeRouter owner is not the timelock");
        require(rs.hasRole(DEFAULT_ADMIN_ROLE, timelock), "post: timelock is not reserve admin");
        require(!rs.hasRole(DEFAULT_ADMIN_ROLE, signer), "post: signer still reserve admin");
        console2.log("[after] both moved to the timelock");
    }
}