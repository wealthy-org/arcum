// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ArcumEngine} from "../src/ArcumEngine.sol";
import {SeriesRegistry} from "../src/SeriesRegistry.sol";
import {PriceGuard} from "../src/PriceGuard.sol";
import {VolOracle} from "../src/VolOracle.sol";
import {IVolOracle} from "../src/interfaces/IVolOracle.sol";
import {VolReading, Series} from "../src/libs/OptionTypes.sol";
import {IOptionEngine} from "../src/interfaces/IOptionEngine.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDGVol is ERC20 {
    constructor() ERC20("USDG", "USDG") {
        _mint(msg.sender, 10_000_000 * 1e6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract VolOracleTest is Test {
    ArcumEngine engine;
    SeriesRegistry registry;
    PriceGuard priceGuard;
    VolOracle volOracle;
    MockUSDGVol usdg;

    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address keeper = address(0xA11CE);
    address user = address(0x3333);
    address pool = address(0x4444);

    bytes32 putSeries;

    function setUp() public {
        usdg = new MockUSDGVol();
        priceGuard = new PriceGuard();
        registry = new SeriesRegistry();
        volOracle = new VolOracle();

        engine = new ArcumEngine(address(registry), address(priceGuard), address(usdg), pool);
        registry.setEngine(address(engine));
        registry.setAllowedStock(NVDA, true);
        priceGuard.setMockPrice(NVDA, 145e18);

        putSeries = registry.listSeries(NVDA, false, uint128(137.75e18), 604800);

        volOracle.setVolConfig(
            NVDA,
            IVolOracle.VolConfig({
                minSigmaBps: 500,
                maxSigmaBps: 30000,
                maxAge: 7200,
                minTtl: 60,
                enabled: true
            })
        );
        volOracle.setPublisher(keeper, true);
        engine.setVolOracle(address(volOracle));

        vm.warp(4 * 86400 + 54000);
        usdg.mint(user, 10_000e6);
    }

    function _reading(uint64 sigmaBps) internal view returns (VolReading memory r) {
        r.sigmaBps = sigmaBps;
        r.skewK = 0;
        r.eventBumpBps = 0;
        r.validUntil = uint64(block.timestamp + 1800);
    }

    // ---- fallback: no oracle wired -> 50% IV, tradeable (staging behaviour preserved) ----

    function testEngineFallsBackToDefaultSigmaWithoutOracle() public {
        ArcumEngine bare = new ArcumEngine(address(registry), address(priceGuard), address(usdg), pool);
        (, , uint64 sigmaBps,) = bare.vMark(putSeries);
        assertEq(sigmaBps, 5000, "no oracle must keep the 50% staging fallback");
    }

    // ---- posting ----

    function testPostStoresSigmaAndReportsSafe() public {
        vm.prank(keeper);
        volOracle.post(NVDA, _reading(8000));

        (uint64 sigmaBps, bool ok) = volOracle.sigmaFor(NVDA);
        assertEq(sigmaBps, 8000, "posted sigma must be returned");
        assertTrue(ok, "fresh in-band reading is tradeable");
    }

    function testPostRejectsNonPublisher() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IVolOracle.NotPublisher.selector, user));
        volOracle.post(NVDA, _reading(8000));
    }

    function testPostRejectsOutOfBandSigma() public {
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(IVolOracle.SigmaOutOfBounds.selector, uint64(49_000), uint64(500), uint64(30_000)));
        volOracle.post(NVDA, _reading(49_000));
    }

    function testPostRejectsExpiredReading() public {
        VolReading memory r = _reading(8000);
        r.validUntil = uint64(block.timestamp - 1);
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(IVolOracle.ValidUntilInPast.selector, r.validUntil));
        volOracle.post(NVDA, r);
    }

    function testPostRejectsHorizonBeyondMaxAge() public {
        VolReading memory r = _reading(8000);
        r.validUntil = uint64(block.timestamp + 7201);
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(IVolOracle.HorizonTooLong.selector, r.validUntil, block.timestamp + 7200));
        volOracle.post(NVDA, r);
    }

    // ---- staleness: valuation keeps last good sigma, new risk is blocked ----

    function testStaleVolKeepsSigmaButBlocksTrading() public {
        vm.prank(keeper);
        volOracle.post(NVDA, _reading(9000));

        (, , uint64 freshSigma,) = engine.vMark(putSeries);
        assertEq(freshSigma, 9000, "engine must price with the posted sigma");

        vm.warp(block.timestamp + 1801);

        (uint64 staleSigma, bool ok) = volOracle.sigmaFor(NVDA);
        assertEq(staleSigma, 9000, "last good sigma is still reported for valuation");
        assertFalse(ok, "stale reading is not tradeable");

        (, , uint64 accrueSigma,) = engine.vMark(putSeries);
        assertEq(accrueSigma, 9000, "accrual keeps the last good sigma");
    }

    function testEngineBlocksBuyOnStaleVol() public {
        vm.prank(keeper);
        volOracle.post(NVDA, _reading(9000));
        vm.warp(block.timestamp + 1801);

        vm.startPrank(user);
        usdg.approve(address(engine), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(IOptionEngine.StaleVol.selector));
        engine.buy(putSeries, 1e18, 5_000e6, uint64(block.timestamp + 3600), user);
        vm.stopPrank();
    }

    function testEngineBlocksBuyInsideEarningsBlackout() public {
        VolReading memory r = _reading(9000);
        r.buyBlockFrom = uint64(block.timestamp);
        r.buyBlockTo = uint64(block.timestamp + 600);
        vm.prank(keeper);
        volOracle.post(NVDA, r);

        assertTrue(volOracle.inEventWindow(NVDA), "blackout must be visible to the oracle");
        assertFalse(engine.quote(putSeries, 1e18, true).buyable, "quote must not offer a buy inside the blackout");

        vm.startPrank(user);
        usdg.approve(address(engine), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(IOptionEngine.EarningsBlock.selector, NVDA));
        engine.buy(putSeries, 1e18, 5_000e6, uint64(block.timestamp + 3600), user);
        vm.stopPrank();
    }

    function testQuoteUsesPostedSigmaForPricing() public {
        uint256 priceDefault = engine.quote(putSeries, 1e18, true).usdg;

        vm.prank(keeper);
        volOracle.post(NVDA, _reading(15_000));
        uint256 priceHighVol = engine.quote(putSeries, 1e18, true).usdg;

        assertGt(priceHighVol, priceDefault, "higher IV must raise the option price");
        assertEq(engine.quote(putSeries, 1e18, true).sigmaBps, 15_000, "quote must expose the sigma actually used");
    }

    // ---- syncSeries: decayed norm rolls to a new epoch instead of a no-op ----

    function testSyncSeriesRelistsDecayedSeries() public {
        Series memory before = registry.seriesOf(putSeries);
        assertFalse(before.archived, "fresh series is live");

        // Above the initial norm (1e18) means every live series counts as decayed.
        registry.setRelistNormThreshold(2e18);

        uint256 idsBefore = registry.seriesCount();
        engine.syncSeries(4);
        uint256 idsAfter = registry.seriesCount();

        assertGt(idsAfter, idsBefore, "syncSeries must list a new epoch");
        Series memory old = registry.seriesOf(putSeries);
        assertTrue(old.archived, "previous epoch must be archived (sell-only)");
    }

    function testSyncSeriesIsNoOpForHealthySeries() public {
        uint256 idsBefore = registry.seriesCount();
        engine.syncSeries(4);
        assertEq(registry.seriesCount(), idsBefore, "healthy series must not be duplicated");
    }

    function testOnlyOwnerCanSetVolOracle() public {
        vm.prank(user);
        vm.expectRevert();
        engine.setVolOracle(address(0));

        engine.setVolOracle(address(volOracle));
        assertEq(address(engine.volOracle()), address(volOracle));
    }
}