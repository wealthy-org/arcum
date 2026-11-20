// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";

interface IOwnable {
    function owner() external view returns (address);
    function transferOwnership(address newOwner) external;
}

/**
 * @notice Moves ownership of the pre-existing 46630 contracts off the leaked staging key
 *         (`0x1B4Faa13…3E45`) and onto the timelock.
 *
 * Why a separate script: these contracts were deployed before the caveat pass, they use
 * plain single-step `Ownable` (no `pendingOwner`), and their owner is a key that leaked in
 * chat on 2026-11-17. `CloseCaveats` does not touch them, so they would otherwise stay on
 * that key forever.
 *
 * Run this with `PRIVATE_KEY` set to the **current** owner key. That is the leaked staging
 * key, which is acceptable for a testnet handover and nothing else: `DeployProduction.s.sol`
 * refuses the same key for production, and it must never be funded on mainnet.
 *
 * Ownership goes straight to the timelock, so after this runs every admin action on these
 * contracts needs a 48-hour proposal. There is no way back without the timelock.
 *
 * Usage:
 *   forge script script/RotateLegacyOwner.s.sol:RotateLegacyOwner \
 *     --rpc-url $RPC --broadcast --slow
 *
 * Simulation only (no broadcast) prints the same plan and changes nothing.
 */
contract RotateLegacyOwner is Script {
    struct Target {
        string name;
        address addr;
    }

    function run() external {
        address timelock = vm.envOr(
            "TL_ADDRESS",
            address(0x249ACeb7d446F5f0375e6E6b6F3b88f88e399E6b)
        );
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address signer = vm.addr(pk);

        Target[3] memory targets = [
            Target("ArcumEngine", vm.envOr("LEGACY_ENGINE", address(0x98F7B4Ae9615a655c4321b1326D588e35303280C))),
            Target("PriceGuard", vm.envOr("LEGACY_PRICE_GUARD", address(0x3D541ad6c67b2B4CAFa1ecBC5E3aC877022c3dBe))),
            Target("SeriesRegistry", vm.envOr("LEGACY_SERIES_REGISTRY", address(0x9c0B29e8faD8854DdFD6Ff1bB823E75788dEa82B)))
        ];

        console2.log("signer  ", signer);
        console2.log("timelock", timelock);

        vm.startBroadcast(pk);
        for (uint256 i = 0; i < targets.length; i++) {
            Target memory t = targets[i];
            if (t.addr.code.length == 0) {
                console2.log("[skip] no code:", t.name);
                continue;
            }

            address current = IOwnable(t.addr).owner();
            if (current == timelock) {
                console2.log("[done] already timelock:", t.name);
                continue;
            }
            if (current != signer) {
                // Not ours to move. Printing this instead of reverting keeps the run honest:
                // a half-owned set is a finding, not a crash.
                console2.log("[skip] signer is not owner:", t.name);
                console2.log("        owner is", current);
                continue;
            }

            IOwnable(t.addr).transferOwnership(timelock);
            console2.log("[set] owner -> timelock:", t.name);
        }
        vm.stopBroadcast();
    }
}
