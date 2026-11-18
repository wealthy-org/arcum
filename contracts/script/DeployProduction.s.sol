// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console, VmSafe} from "forge-std/Script.sol";
import {PriceGuardProd, IPriceFeedV3} from "../src/PriceGuardProd.sol";
import {SeriesRegistry} from "../src/SeriesRegistry.sol";
import {ArcumEngine} from "../src/ArcumEngine.sol";
import {WriterPool} from "../src/WriterPool.sol";
import {Reserve} from "../src/Reserve.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {AgentRouter} from "../src/AgentRouter.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IOptionEngine} from "../src/interfaces/IOptionEngine.sol";
import {IPriceGuard} from "../src/interfaces/IPriceGuard.sol";
import {IPriceReference} from "../src/interfaces/IPriceReference.sol";
import {IReserve} from "../src/interfaces/IReserve.sol";
import {IFeeRouter} from "../src/interfaces/IFeeRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20MetaProd {
    function decimals() external view returns (uint8);
}

/// @title DeployProduction
/// @notice Production deployment for Arcum. Deploys the REAL stack: a real USDG token supplied by env, a real
/// AggregatorV3 oracle per stock, and `PriceGuardProd` (no `setMockPrice`, no MockUSDG, no demo minting).
/// @dev Refuses to broadcast unless every address exists on-chain and every feed answers. This is deliberate: the
/// previous script (`Deploy.s.sol`) is a staging/demo script and must never be pointed at production.
///
/// Required env:
///   PRIVATE_KEY          deployer key (local only; already-rotated key recommended)
///   USDG_ADDRESS         settlement token on the target chain
///   OWNER_ADDRESS        production owner (Safe/multisig, or an EOA if explicitly accepted)
///   STOCK_SYMBOLS        comma separated, e.g. NVDA,TSLA,SPY
///   STOCK_<SYMBOL>       stock token address per symbol
///   FEED_<SYMBOL>        AggregatorV3 feed address per symbol
///
/// Optional env:
///   DRY_RUN=true              validate inputs only, deploy nothing
///   SERIES_SPECS              "NVDA:call:140:86400;NVDA:put:137:604800" (strike in whole dollars)
///   TWAP_REFERENCE            UniswapV3TwapReference address (enables TWAP band per stock)
///   TWAP_FEE                  pool fee tier for the TWAP reference (default 3000)
///   TWAP_BAND_BPS             default 200
///   MAX_AGE_REGULAR           default 90000 (25h: Robinhood Chain equity feeds heartbeat at 86400s)
///   MAX_AGE_EXTENDED          default 90000
///   CONTINUITY_BPS            default 0 (0 disables the pre-configure continuity check)
///   POOL_LOCK_SECONDS         default 300
///   POOL_CASH_BUFFER_BPS      default 1000
///   POOL_MAX_SLIPPAGE_BPS     default 100
///   POOL_MAX_TOTAL_DEPOSITS   default 0 (unlimited until set)
///   RENOUNCE_DEPLOYER=true    hand DEFAULT_ADMIN_ROLE fully to OWNER_ADDRESS (irreversible)
contract DeployProduction is Script {
    struct SeriesSpec {
        address stock;
        bool isCall;
        uint256 strikeWad;
        uint32 tauSeconds;
    }

    function run() external {
        bool dryRun = vm.envOr("DRY_RUN", false);

        address usdg = vm.envAddress("USDG_ADDRESS");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));

        _requireContract(usdg, "USDG_ADDRESS");
        if (usdg.code.length == 0) revert("USDG_ADDRESS has no code on this chain");
        if (owner == address(0)) revert("OWNER_ADDRESS required");

        uint8 usdgDecimals = IERC20MetaProd(usdg).decimals();
        if (usdgDecimals != 6 && usdgDecimals != 18) revert("unsupported USDG decimals");

        (address[] memory stocks, address[] memory feeds, string[] memory symbols) = _loadStocks();

        uint24 twapFee = uint24(vm.envOr("TWAP_FEE", uint256(3000)));
        uint16 twapBandBps = uint16(vm.envOr("TWAP_BAND_BPS", uint256(200)));
        uint32 maxAgeRegular = uint32(vm.envOr("MAX_AGE_REGULAR", uint256(90_000)));
        uint32 maxAgeExtended = uint32(vm.envOr("MAX_AGE_EXTENDED", uint256(90_000)));
        uint16 continuityBps = uint16(vm.envOr("CONTINUITY_BPS", uint256(0)));
        address twapReference = vm.envOr("TWAP_REFERENCE", address(0));
        bool renounce = vm.envOr("RENOUNCE_DEPLOYER", false);

        console.log("=== Arcum production deploy preflight ===");
        console.log("chainId        :", block.chainid);
        console.log("deployer       :", deployer);
        console.log("owner          :", owner);
        console.log("USDG           :", usdg);
        console.log("USDG decimals  :", usdgDecimals);
        console.log("stocks         :", stocks.length);
        console.log("TWAP reference :", twapReference);
        if (owner == deployer) {
            console.log("WARNING: OWNER_ADDRESS == deployer. Production ownership should be a Safe/multisig.");
        }
        if (twapReference == address(0)) {
            console.log("WARNING: no TWAP_REFERENCE configured; the TWAP band cross-check stays disabled.");
        }
        for (uint256 i; i < stocks.length; ++i) {
            console.log(string.concat("stock ", symbols[i]), stocks[i]);
            console.log(string.concat("feed  ", symbols[i]), feeds[i]);
        }

        if (dryRun) {
            console.log("DRY_RUN=true: inputs valid, nothing deployed.");
            return;
        }

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // 1. Price guard that actually reads the configured feeds.
        PriceGuardProd guard = new PriceGuardProd();
        console.log("PriceGuardProd:", address(guard));

        // 2. Registry.
        SeriesRegistry registry = new SeriesRegistry();
        console.log("SeriesRegistry:", address(registry));

        // 3. Writer pool (UUPS proxy).
        WriterPool poolImpl = new WriterPool(72 hours);
        bytes memory poolInit =
            abi.encodeWithSelector(WriterPool.initialize.selector, deployer, usdg, IOptionEngine(address(0)), guard);
        ERC1967Proxy poolProxy = new ERC1967Proxy(address(poolImpl), poolInit);
        WriterPool pool = WriterPool(address(poolProxy));
        console.log("WriterPool impl:", address(poolImpl));
        console.log("WriterPool proxy:", address(pool));

        // 4. Engine.
        ArcumEngine engine = new ArcumEngine(address(registry), address(guard), usdg, address(pool));
        registry.setEngine(address(engine));
        console.log("ArcumEngine:", address(engine));

        // 5. Reserve, fees, agent router.
        Reserve reserve = new Reserve(owner, IERC20(usdg), address(pool));
        FeeRouter feeRouter = new FeeRouter(usdg, address(pool), owner, owner, owner);
        AgentRouter agentRouter = new AgentRouter(address(engine));
        console.log("Reserve:", address(reserve));
        console.log("FeeRouter:", address(feeRouter));
        console.log("AgentRouter:", address(agentRouter));

        // 6. Wire modules and params.
        pool.setModules(
            IOptionEngine(address(engine)),
            IReserve(address(reserve)),
            IFeeRouter(address(feeRouter)),
            IPriceReference(twapReference)
        );
        pool.setParams(
            uint32(vm.envOr("POOL_LOCK_SECONDS", uint256(300))),
            uint16(vm.envOr("POOL_CASH_BUFFER_BPS", uint256(1000))),
            uint16(vm.envOr("POOL_MAX_SLIPPAGE_BPS", uint256(100))),
            uint128(vm.envOr("POOL_MAX_TOTAL_DEPOSITS", uint256(0)))
        );
        pool.setPublicDeposits(vm.envOr("POOL_PUBLIC_DEPOSITS", true));

        // 7. Configure the guard with REAL feeds.
        IPriceGuard.StockConfig[] memory cfgs = new IPriceGuard.StockConfig[](stocks.length);
        for (uint256 i; i < stocks.length; ++i) {
            cfgs[i] = IPriceGuard.StockConfig({
                feed: feeds[i],
                multiplierEmbedded: true,
                maxAgeRegular: maxAgeRegular,
                maxAgeExtended: maxAgeExtended,
                continuityBps: continuityBps,
                enabled: true
            });
            registry.setAllowedStock(stocks[i], true);
        }
        guard.setStocks(stocks, cfgs);

        if (twapReference != address(0)) {
            for (uint256 i; i < stocks.length; ++i) {
                guard.setTwapReference(stocks[i], IPriceReference(twapReference), twapFee, 1800, twapBandBps);
            }
        }

        // 8. Series.
        SeriesSpec[] memory specs = _loadSeries(symbols, stocks);
        for (uint256 i; i < specs.length; ++i) {
            registry.listSeries(specs[i].stock, specs[i].isCall, uint128(specs[i].strikeWad), specs[i].tauSeconds);
        }

        // 9. Hand ownership to the production owner.
        // Reserve was constructed with `owner` as its DEFAULT_ADMIN_ROLE, so it needs no grant here.
        pool.grantRole(pool.DEFAULT_ADMIN_ROLE(), owner);
        registry.transferOwnership(owner);
        engine.transferOwnership(owner);
        feeRouter.transferOwnership(owner);
        guard.transferOwnership(owner); // two-step: owner must call acceptOwnership()

        if (renounce) {
            pool.renounceRole(pool.DEFAULT_ADMIN_ROLE(), deployer);
            console.log("Deployer renounced DEFAULT_ADMIN_ROLE on the writer pool.");
        } else {
            console.log("Deployer retains DEFAULT_ADMIN_ROLE (RENOUNCE_DEPLOYER=false).");
        }

        vm.stopBroadcast();

        console.log("=== preflight complete: review ownership/params before enabling deposits ===");

        _writeManifest(
            address(guard),
            address(registry),
            address(poolImpl),
            address(pool),
            address(engine),
            address(reserve),
            address(feeRouter),
            address(agentRouter),
            usdg,
            owner,
            twapReference
        );
    }

    // ---------------------------------------------------------------------------------------------- helpers

    function _loadStocks()
        internal
        view
        returns (address[] memory stocks, address[] memory feeds, string[] memory symbols)
    {
        symbols = _split(vm.envString("STOCK_SYMBOLS"), ",");
        if (symbols.length == 0) revert("STOCK_SYMBOLS required");
        stocks = new address[](symbols.length);
        feeds = new address[](symbols.length);

        for (uint256 i; i < symbols.length; ++i) {
            string memory sym = _trim(symbols[i]);
            address stock = vm.envAddress(string.concat("STOCK_", sym));
            address feed = vm.envAddress(string.concat("FEED_", sym));
            if (stock == address(0)) revert(string.concat("STOCK_", sym, " missing"));
            if (feed == address(0)) revert(string.concat("FEED_", sym, " missing"));
            if (stock.code.length == 0) revert(string.concat("STOCK_", sym, " has no code"));
            if (feed.code.length == 0) revert(string.concat("FEED_", sym, " has no code"));

            (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) =
                IPriceFeedV3(feed).latestRoundData();
            if (answer <= 0 || updatedAt == 0) revert(string.concat("FEED_", sym, " not answering"));
            if (roundId != 0 && answeredInRound < roundId) revert(string.concat("FEED_", sym, " incomplete round"));

            stocks[i] = stock;
            feeds[i] = feed;
            symbols[i] = sym;
        }
    }

    function _loadSeries(string[] memory symbols, address[] memory stocks) internal view returns (SeriesSpec[] memory) {
        string memory raw = vm.envOr("SERIES_SPECS", string(""));
        if (bytes(raw).length == 0) return new SeriesSpec[](0);

        string[] memory entries = _split(raw, ";");
        uint256 count;
        for (uint256 i; i < entries.length; ++i) {
            if (bytes(_trim(entries[i])).length != 0) ++count;
        }
        SeriesSpec[] memory specs = new SeriesSpec[](count);
        uint256 k;
        for (uint256 i; i < entries.length; ++i) {
            string memory entry = _trim(entries[i]);
            if (bytes(entry).length == 0) continue;
            string[] memory parts = _split(entry, ":");
            if (parts.length != 4) revert("SERIES_SPECS entry must be SYMBOL:call|put:strike:tau");

            address stock;
            for (uint256 j; j < symbols.length; ++j) {
                if (_eq(symbols[j], _trim(parts[0]))) stock = stocks[j];
            }
            if (stock == address(0)) revert(string.concat("SERIES_SPECS unknown symbol ", parts[0]));

            specs[k++] = SeriesSpec({
                stock: stock,
                isCall: _eq(_trim(parts[1]), "call"),
                strikeWad: vm.parseUint(_trim(parts[2])) * 1e18,
                tauSeconds: uint32(vm.parseUint(_trim(parts[3])))
            });
        }
    }

    function _writeManifest(
        address guard,
        address registry,
        address poolImpl,
        address pool,
        address engine,
        address reserve,
        address feeRouter,
        address agentRouter,
        address usdg,
        address owner,
        address twapReference
    ) internal {
        string memory k = "deploy";
        vm.serializeAddress(k, "usdg", usdg);
        vm.serializeAddress(k, "priceGuard", guard);
        vm.serializeAddress(k, "seriesRegistry", registry);
        vm.serializeAddress(k, "writerPoolImpl", poolImpl);
        vm.serializeAddress(k, "writerPoolProxy", pool);
        vm.serializeAddress(k, "engineProxy", engine);
        vm.serializeAddress(k, "reserve", reserve);
        vm.serializeAddress(k, "feeRouter", feeRouter);
        vm.serializeAddress(k, "agentRouter", agentRouter);
        vm.serializeAddress(k, "twapReference", twapReference);
        vm.serializeAddress(k, "owner", owner);
        string memory outJson = vm.serializeUint(k, "chainId", block.chainid);

        if (vm.isContext(VmSafe.ForgeContext.ScriptBroadcast) || vm.envOr("WRITE_MANIFEST", false)) {
            string memory path = string.concat("../deployments/", vm.toString(block.chainid), "-production.json");
            vm.writeJson(outJson, path);
            console.log("Manifest written:", path);
        }
    }

    function _requireContract(address addr, string memory label) internal view {
        if (addr == address(0)) revert(string.concat(label, " required"));
    }

    function _split(string memory s, string memory sep) internal pure returns (string[] memory parts) {
        bytes memory b = bytes(s);
        bytes memory seps = bytes(sep);
        uint256 count = 1;
        for (uint256 i; i < b.length; ++i) {
            if (b[i] == seps[0]) ++count;
        }
        parts = new string[](count);
        uint256 start;
        uint256 idx;
        for (uint256 i; i < b.length; ++i) {
            if (b[i] == seps[0]) {
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

    function _eq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}