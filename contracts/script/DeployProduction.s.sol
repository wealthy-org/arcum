// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console, VmSafe} from "forge-std/Script.sol";
import {PriceGuardProd, IPriceFeedV3} from "../src/PriceGuardProd.sol";
import {VolOracle} from "../src/VolOracle.sol";
import {IVolOracle} from "../src/interfaces/IVolOracle.sol";
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
/// Required env (one of two signing modes):
///   PRIVATE_KEY          raw key, local only (gitignored .env.production, delete after broadcast)
///   -- OR --
///   DEPLOYER_ADDRESS     with `forge script --account <keystore> --sender <addr>`: the key stays in the Foundry
///                        encrypted keystore (~/.foundry/keystores) and never touches a plaintext file.
///
/// Optional signing env:
///   PRIVATE_KEY          see above; ignored when a CLI --account is used
///   DEPLOYER_ADDRESS     see above
///
/// Required env, continued:
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
///   MAX_AGE_REGULAR           default 300   (5 min; measured feed cadence during a live session)
///   MAX_AGE_EXTENDED          default 900   (15 min; 04:00-09:30 and 16:00-20:00 ET)
/// @dev CLOSED sessions do not consult either value: `PriceGuardProd.MAX_AGE_CLOSED` (3 days) applies there.
///   CONTINUITY_BPS            default 0 (0 disables the pre-configure continuity check)
///   POOL_LOCK_SECONDS         default 300
///   POOL_CASH_BUFFER_BPS      default 1000
///   POOL_MAX_SLIPPAGE_BPS     default 100
///   POOL_MAX_TOTAL_DEPOSITS   default 0 (unlimited until set)
///   RENOUNCE_DEPLOYER=true    hand DEFAULT_ADMIN_ROLE fully to OWNER_ADDRESS (irreversible)
///   VOL_MIN_SIGMA_BPS         default 500   (5% floor accepted from the vol keeper)
///   VOL_MAX_SIGMA_BPS         default 30000 (300% ceiling accepted from the vol keeper)
///   VOL_MAX_AGE               default 7200  (longest validUntil - now a reading may claim)
///   VOL_MIN_TTL               default 60    (shortest accepted time-to-live for a reading)
contract DeployProduction is Script {
    /// @notice The staging deployer key from 2026-11-17. Its private key was exposed in a chat and was never rotated,
    /// and it still holds owner/admin on the staging contracts. A production deploy signed by it is a backdoor, so the
    /// script refuses it outright instead of trusting an operator to remember.
    address internal constant COMPROMISED_STAGING_DEPLOYER = 0x1B4Faa130Aa607Fce29F9AAd6120b4492DE93e45;

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
        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer = pk != 0 ? vm.addr(pk) : vm.envOr("DEPLOYER_ADDRESS", msg.sender);

        _requireCode(usdg, "USDG_ADDRESS");
        if (owner == address(0)) revert("OWNER_ADDRESS required");

        // ---- hard guard rails: refuse to mint a production system with a known-leaked key or a self-owned deploy ----
        _guardAccounts(deployer, owner, vm.envOr("ALLOW_EOA_OWNER", false));

        uint8 usdgDecimals = IERC20MetaProd(usdg).decimals();
        if (usdgDecimals != 6 && usdgDecimals != 18) revert("unsupported USDG decimals");

        (address[] memory stocks, address[] memory feeds, string[] memory symbols) = _loadStocks();

        uint24 twapFee = uint24(vm.envOr("TWAP_FEE", uint256(3000)));
        uint16 twapBandBps = uint16(vm.envOr("TWAP_BAND_BPS", uint256(200)));
        uint32 maxAgeRegular = uint32(vm.envOr("MAX_AGE_REGULAR", uint256(300)));
        uint32 maxAgeExtended = uint32(vm.envOr("MAX_AGE_EXTENDED", uint256(900)));
        _requireSaneMaxAge(maxAgeRegular, maxAgeExtended);
        uint16 continuityBps = uint16(vm.envOr("CONTINUITY_BPS", uint256(0)));
        address twapReference = vm.envOr("TWAP_REFERENCE", address(0));
        bool renounce = vm.envOr("RENOUNCE_DEPLOYER", false);

        uint64 volMinSigmaBps = uint64(vm.envOr("VOL_MIN_SIGMA_BPS", uint256(500)));
        uint64 volMaxSigmaBps = uint64(vm.envOr("VOL_MAX_SIGMA_BPS", uint256(30_000)));
        uint32 volMaxAge = uint32(vm.envOr("VOL_MAX_AGE", uint256(7200)));
        uint32 volMinTtl = uint32(vm.envOr("VOL_MIN_TTL", uint256(60)));

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

        // Two signing modes: raw PRIVATE_KEY from the gitignored env file, or a Foundry encrypted keystore passed as
        // `--account <name> --sender <address>` (then the key never exists as plaintext on disk).
        if (pk != 0) {
            vm.startBroadcast(pk);
        } else {
            vm.startBroadcast();
        }

        // 1. Price guard that actually reads the configured feeds.
        PriceGuardProd guard = new PriceGuardProd();
        console.log("PriceGuardProd:", address(guard));

        // 2. Registry.
        SeriesRegistry registry = new SeriesRegistry();
        console.log("SeriesRegistry:", address(registry));

        // 2b. Vol oracle: the engine must price with real posted IV, not the 50% staging fallback.
        VolOracle volOracle = new VolOracle();
        console.log("VolOracle:", address(volOracle));

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

        // 7b. Vol oracle config per stock + wire the engine to it. No VolOracle == no production pricing.
        for (uint256 i; i < stocks.length; ++i) {
            volOracle.setVolConfig(
                stocks[i],
                IVolOracle.VolConfig({
                    minSigmaBps: volMinSigmaBps,
                    maxSigmaBps: volMaxSigmaBps,
                    maxAge: volMaxAge,
                    minTtl: volMinTtl,
                    enabled: true
                })
            );
        }
        // The keeper posts from a hot key; `owner` is granted first so the Safe can hand it to the keeper hot key.
        volOracle.setPublisher(owner, true);
        engine.setVolOracle(address(volOracle));
        console.log("VolOracle wired to engine. Publisher granted to owner.");

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
        volOracle.transferOwnership(owner); // two-step as well

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
            address(volOracle),
            usdg,
            owner,
            twapReference
        );
    }

    // ---------------------------------------------------------------------------------------------- helpers

    /// @notice Guard rails shared by `run()` and its tests. Split out so the refusal path can be tested directly
    /// without needing the actual private key of the compromised address.
    /// @dev `allowEoaOwner` is the deliberate escape hatch (`ALLOW_EOA_OWNER=true`) for an accepted EOA owner; it does
    /// NOT bypass the compromised-deployer check.
    function _guardAccounts(address deployer, address owner, bool allowEoaOwner) internal view {
        if (deployer == COMPROMISED_STAGING_DEPLOYER) {
            revert("deployer is the compromised staging key (exposed 2026-11-17): generate a fresh key first");
        }
        if (!allowEoaOwner) {
            if (owner == deployer) {
                revert("OWNER_ADDRESS must not be the deployer: hand production ownership to a Safe/multisig");
            }
            if (owner.code.length == 0) {
                revert("OWNER_ADDRESS has no code: expected a Safe/multisig (set ALLOW_EOA_OWNER=true to accept an EOA");
            }
        }
    }

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
            _requireCode(stock, string.concat("STOCK_", sym));
            _requireCode(feed, string.concat("FEED_", sym));

            (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) =
                _requireAnsweringFeed(feed, string.concat("FEED_", sym));

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
        address volOracle,
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
        vm.serializeAddress(k, "volOracle", volOracle);
        vm.serializeAddress(k, "twapReference", twapReference);
        vm.serializeAddress(k, "owner", owner);
        string memory outJson = vm.serializeUint(k, "chainId", block.chainid);

        if (vm.isContext(VmSafe.ForgeContext.ScriptBroadcast) || vm.envOr("WRITE_MANIFEST", false)) {
            string memory path = string.concat("../deployments/", vm.toString(block.chainid), "-production.json");
            vm.writeJson(outJson, path);
            console.log("Manifest written:", path);
        }
    }

    /// @notice Refuses a missing or codeless address. Split out so the refusal path is unit-testable without
    /// fighting `vm.setEnv` caching (see `test/DeployProduction.t.sol`).
    function _requireCode(address addr, string memory label) internal view {
        if (addr == address(0)) revert(string.concat(label, " required"));
        if (addr.code.length == 0) revert(string.concat(label, " has no code on this chain"));
    }

    /// @notice Refuses a staleness window loose enough to trade on an intraday-stale answer.
    /// @dev `MAX_AGE_CLOSED` (3 days) already covers closed sessions and is not configurable, so a long REGULAR or
    /// EXTENDED window buys nothing for weekends — it only loosens the window that matters, while the market is open.
    /// The previous shipped value was 90000s (25h) on the mistaken belief that the feeds heartbeat once a day.
    function _requireSaneMaxAge(uint32 maxAgeRegular, uint32 maxAgeExtended) internal pure {
        if (maxAgeRegular == 0 || maxAgeRegular > 3600) revert("MAX_AGE_REGULAR too loose: >1h during a live session");
        if (maxAgeExtended == 0 || maxAgeExtended > 3600) revert("MAX_AGE_EXTENDED too loose: >1h during a live session");
    }

    /// @notice Refuses a feed that is silent, zero-priced, or stuck in an incomplete round.
    function _requireAnsweringFeed(address feed, string memory label)
        internal
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        (roundId, answer, startedAt, updatedAt, answeredInRound) = IPriceFeedV3(feed).latestRoundData();
        if (answer <= 0 || updatedAt == 0) revert(string.concat(label, " not answering"));
        if (roundId != 0 && answeredInRound < roundId) revert(string.concat(label, " incomplete round"));
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