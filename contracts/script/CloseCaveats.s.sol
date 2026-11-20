// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console, VmSafe} from "forge-std/Script.sol";
import {CaveatCloser} from "./CaveatCloser.sol";

/// @title CloseCaveats
/// @notice One orchestrated pass that closes the remaining "not production shaped" caveats on the live testnet stack:
///
///   1. `TimelockController` — admin actions stop being instantaneous.
///   2. `VolOracle` — the engine's IV source, configured per stock, publisher key separate from admin.
///   3. `KeeperTwapReference` — a real `IPriceReference` on a chain with no Uniswap v3 pool for stock/USDG.
///   4. `ArcumAccountFactory` + `ArcumPaymaster` — ERC-4337 v0.7 accounts on the canonical EntryPoint.
///   5. Admin transfers — VolOracle/KeeperTwap (two-step, accepted by the timelock) and the paymaster end at the
///      timelock.
///   6. Delay raise — `updateDelay(TL_FINAL_DELAY)` executed through the timelock itself.
///
/// The wiring lives in `CaveatCloser` and runs inside a single constructor, so one broadcast transaction carries every
/// nested call (create, configure, hand over, raise delay). That is also what lets `test/CloseCaveats.t.sol` rehearse
/// the exact same code path on a fork instead of re-implementing it.
///
/// Env:
///   PRIVATE_KEY            required; signs the deployment
///   DRY_RUN=true           validate + log inputs, broadcast nothing (same as `--dry-run`, which forge does not accept)
///   OWNER_ADDRESS          final human admin (Safe/multisig). Defaults to the deployer on testnet.
///   KEEPER_ADDRESS         publisher/keeper hot key. Defaults to OWNER_ADDRESS.
///   TL_PROPOSER            default deployer
///   TL_EXECUTOR            default deployer
///   TL_INITIAL_DELAY       default 0 (bootstrap only; the delay is raised in the same transaction)
///   TL_FINAL_DELAY         default 172800 (48h)
///   STOCK_SYMBOLS          optional comma list, e.g. NVDA,AAPL,QQQ; each needs STOCK_<SYM>
///   VOL_MIN_SIGMA_BPS      default 500
///   VOL_MAX_SIGMA_BPS      default 30000
///   VOL_MAX_AGE            default 7200
///   VOL_MIN_TTL            default 60
///   TWAP_WINDOW            default 3600 (averaging window)
///   TWAP_MIN_INTERVAL      default 300 (minimum gap between keeper posts)
///   AA_ENTRYPOINT          default 0x0000000071727De22E5E9d8BAf0edAc6f37da032 (ERC-4337 v0.7 singleton)
///   AA_PAYMASTER_DEPOSIT   default 0; ETH moved into the EntryPoint deposit for the paymaster
contract CloseCaveats is Script {
    address internal constant ENTRY_POINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    function run() external {
        bool dryRun = vm.envOr("DRY_RUN", false);
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        if (deployer == address(0)) revert("PRIVATE_KEY required");

        (address[] memory stocks, string[] memory symbols) = _loadStocks();

        CaveatCloser.Params memory p = CaveatCloser.Params({
            owner: vm.envOr("OWNER_ADDRESS", deployer),
            keeper: vm.envOr("KEEPER_ADDRESS", vm.envOr("OWNER_ADDRESS", deployer)),
            proposer: vm.envOr("TL_PROPOSER", deployer),
            executor: vm.envOr("TL_EXECUTOR", deployer),
            tlInitialDelay: vm.envOr("TL_INITIAL_DELAY", uint256(0)),
            tlFinalDelay: vm.envOr("TL_FINAL_DELAY", uint256(48 hours)),
            stocks: stocks,
            symbols: symbols,
            volMinSigmaBps: uint64(vm.envOr("VOL_MIN_SIGMA_BPS", uint256(500))),
            volMaxSigmaBps: uint64(vm.envOr("VOL_MAX_SIGMA_BPS", uint256(30_000))),
            volMaxAge: uint32(vm.envOr("VOL_MAX_AGE", uint256(7200))),
            volMinTtl: uint32(vm.envOr("VOL_MIN_TTL", uint256(60))),
            twapWindow: uint32(vm.envOr("TWAP_WINDOW", uint256(3600))),
            twapMinInterval: uint32(vm.envOr("TWAP_MIN_INTERVAL", uint256(300))),
            entryPoint: vm.envOr("AA_ENTRYPOINT", ENTRY_POINT_V07),
            paymasterDeposit: vm.envOr("AA_PAYMASTER_DEPOSIT", uint256(0))
        });

        _logPlan(deployer, p);

        if (dryRun) {
            console.log("DRY_RUN=true: inputs valid, nothing deployed.");
            return;
        }

        vm.startBroadcast(pk);
        CaveatCloser closer = new CaveatCloser{value: p.paymasterDeposit}(p);
        vm.stopBroadcast();

        CaveatCloser.Deployment memory d = closer.deployment();
        console.log("TimelockController:", d.timelock);
        console.log("VolOracle:", d.volOracle);
        console.log("KeeperTwapReference:", d.keeperTwap);
        console.log("ArcumAccountFactory:", d.accountFactory);
        console.log("ArcumPaymaster:", d.paymaster);

        _writeManifest(d, p);
    }

    function _logPlan(address deployer, CaveatCloser.Params memory p) internal view {
        console.log("=== Arcum caveat closure ===");
        console.log("chainId        :", block.chainid);
        console.log("deployer       :", deployer);
        console.log("owner          :", p.owner);
        console.log("keeper         :", p.keeper);
        console.log("tl initial     :", p.tlInitialDelay);
        console.log("tl final       :", p.tlFinalDelay);
        console.log("stocks         :", p.stocks.length);
        console.log("twap window    :", p.twapWindow);
        console.log("twap interval  :", p.twapMinInterval);
        console.log("entryPoint     :", p.entryPoint);
        console.log("paymaster fund :", p.paymasterDeposit);
        if (p.owner == deployer) {
            console.log("WARNING: owner == deployer. Testnet rehearsal only; production needs a Safe.");
        }
    }

    function _writeManifest(CaveatCloser.Deployment memory d, CaveatCloser.Params memory p) internal {
        if (!vm.isContext(VmSafe.ForgeContext.ScriptBroadcast) && !vm.envOr("WRITE_MANIFEST", false)) return;

        string memory k = "caveats";
        vm.serializeUint(k, "chainId", block.chainid);
        vm.serializeAddress(k, "deployer", d.deployer);
        vm.serializeAddress(k, "timelock", d.timelock);
        vm.serializeUint(k, "timelockDelay", p.tlFinalDelay);
        vm.serializeAddress(k, "volOracle", d.volOracle);
        vm.serializeAddress(k, "keeperTwapReference", d.keeperTwap);
        vm.serializeUint(k, "twapWindow", p.twapWindow);
        vm.serializeUint(k, "twapMinInterval", p.twapMinInterval);
        vm.serializeAddress(k, "accountFactory", d.accountFactory);
        vm.serializeAddress(k, "paymaster", d.paymaster);
        vm.serializeAddress(k, "entryPoint", p.entryPoint);
        vm.serializeAddress(k, "owner", p.owner);
        vm.serializeAddress(k, "keeper", p.keeper);
        string[] memory stockKeys = new string[](p.stocks.length);
        for (uint256 i; i < p.stocks.length; ++i) {
            stockKeys[i] = p.symbols[i];
            vm.serializeAddress(k, p.symbols[i], p.stocks[i]);
        }
        string memory outJson = vm.serializeString(k, "stocks", stockKeys);

        string memory path = string.concat("../deployments/", vm.toString(block.chainid), "-caveats.json");
        vm.writeJson(outJson, path);
        console.log("Manifest written:", path);
    }

    function _loadStocks() internal view returns (address[] memory stocks, string[] memory symbols) {
        string memory raw = vm.envOr("STOCK_SYMBOLS", string(""));
        if (bytes(raw).length == 0) return (new address[](0), new string[](0));

        symbols = _split(raw, ",");
        stocks = new address[](symbols.length);
        for (uint256 i; i < symbols.length; ++i) {
            symbols[i] = _trim(symbols[i]);
            stocks[i] = vm.envAddress(string.concat("STOCK_", symbols[i]));
            if (stocks[i] == address(0)) revert(string.concat("STOCK_", symbols[i], " required"));
        }
    }

    function _split(string memory s, string memory sep) internal pure returns (string[] memory parts) {
        bytes memory b = bytes(s);
        bytes1 seps = bytes(sep)[0];
        uint256 count = 1;
        for (uint256 i; i < b.length; ++i) {
            if (b[i] == seps) ++count;
        }
        parts = new string[](count);
        uint256 start;
        uint256 idx;
        for (uint256 i; i < b.length; ++i) {
            if (b[i] == seps) {
                parts[idx++] = _slice(s, start, i);
                start = i + 1;
            }
        }
        parts[idx] = _slice(s, start, b.length);
    }

    function _slice(string memory s, uint256 start, uint256 end) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        if (end <= start) return "";
        bytes memory out = new bytes(end - start);
        for (uint256 i; i < end - start; ++i) {
            out[i] = b[start + i];
        }
        return string(out);
    }

    function _trim(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        uint256 start;
        uint256 end = b.length;
        while (start < end && (b[start] == " " || b[start] == "\t" || b[start] == "\n" || b[start] == "\r")) ++start;
        while (end > start && (b[end - 1] == " " || b[end - 1] == "\t" || b[end - 1] == "\n" || b[end - 1] == "\r"))
            --end;
        return _slice(s, start, end);
    }
}