// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {PriceGuardProd, IPriceFeedV3} from "../src/PriceGuardProd.sol";
import {AggregatorV3Interface} from "../src/interfaces/AggregatorV3Interface.sol";
import {MockAggregator} from "../src/mocks/MockAggregator.sol";
import {IPriceGuard} from "../src/interfaces/IPriceGuard.sol";
import {IPriceReference} from "../src/interfaces/IPriceReference.sol";
import {PriceReading, SessionKind} from "../src/libs/OptionTypes.sol";

/// @title PriceGuardChainlinkTest
/// @notice Exercises the Chainlink-specific semantics of `PriceGuardProd` against a `MockAggregator`, without a fork.
/// The live-feed equivalent is `test/fork/Mainnet4663.t.sol`.
///
/// What this file is here to prove, in the words of the Robinhood Chain oracle docs:
///  - the multiplier is already inside the feed answer, so the guard must never scale it again;
///  - `decimals()` is honoured (8 on the equity feeds, but 6 and 18 must also work);
///  - `updatedAt` is the freshness source of truth and a stale answer must pause buys;
///  - `answeredInRound < roundId` marks an incomplete round and must be treated as invalid;
///  - a reverting, zero, or negative feed must never revert the guard.
contract PriceGuardChainlinkTest is Test {
    PriceGuardProd internal guard;
    MockAggregator internal feed;

    address internal constant STOCK = address(0xA11CE);
    address internal constant OTHER = address(0xB0B);

    /// @dev 2026-11-20 15:00 UTC = Friday 10:00 ET (EST, UTC-5) => REGULAR session. Fixed so tests never depend on the
    /// wall clock.
    uint256 internal constant REGULAR_TS = 1_795_186_800;

    function setUp() public {
        vm.warp(REGULAR_TS);
        guard = new PriceGuardProd();
        feed = new MockAggregator(8, "RHNVDA / USD", 14_330_682_831, block.timestamp); // $143.30682831, 8 dp
    }

    // ------------------------------------------------------------------ helpers

    function _cfg(uint32 maxAgeRegular) internal view returns (IPriceGuard.StockConfig memory) {
        return IPriceGuard.StockConfig({
            feed: address(feed),
            multiplierEmbedded: true,
            maxAgeRegular: maxAgeRegular,
            maxAgeExtended: 900,
            continuityBps: 0,
            enabled: true
        });
    }

    function _configure(uint32 maxAgeRegular) internal {
        guard.setStock(STOCK, _cfg(maxAgeRegular));
    }

    // ------------------------------------------------------------------ interface parity

    function test_feed_satisfiesCanonicalAggregatorV3Interface() public view {
        AggregatorV3Interface f = AggregatorV3Interface(address(feed));
        assertEq(f.decimals(), 8, "decimals");
        assertEq(f.description(), "RHNVDA / USD", "description");
        assertEq(f.version(), 4, "version");
        (uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = f.latestRoundData();
        assertEq(roundId, answeredInRound, "complete round");
        assertEq(answer, 14_330_682_831, "answer");
        assertEq(updatedAt, block.timestamp, "updatedAt");
    }

    /// @dev `IPriceFeedV3` (the narrow surface the guard reads) must be a subset of `AggregatorV3Interface` (the full
    /// ABI off-chain consumers use), so a feed that satisfies the full interface also satisfies the guard.
    function test_feed_narrowSurfaceMatchesCanonicalInterface() public view {
        AggregatorV3Interface full = AggregatorV3Interface(address(feed));
        IPriceFeedV3 narrow = IPriceFeedV3(address(feed));

        assertEq(narrow.decimals(), full.decimals(), "decimals agree");
        (uint80 r1, int256 a1, , uint256 u1, uint80 ar1) = narrow.latestRoundData();
        (uint80 r2, int256 a2, , uint256 u2, uint80 ar2) = full.latestRoundData();
        assertEq(r1, r2, "roundId agrees");
        assertEq(a1, a2, "answer agrees");
        assertEq(u1, u2, "updatedAt agrees");
        assertEq(ar1, ar2, "answeredInRound agrees");
    }

    // ------------------------------------------------------------------ decimals

    function test_scales8DecimalsToWad() public {
        _configure(120);
        PriceReading memory r = guard.read(STOCK);
        assertEq(r.s, 143.30682831e18, "8 dp scaled to WAD");
        assertTrue(r.fresh);
        assertFalse(r.buysPaused);
    }

    function test_scales18DecimalsToWad() public {
        MockAggregator f18 = new MockAggregator(18, "X / USD", 143.30682831e18, block.timestamp);
        guard.setStock(OTHER, _cfgWithFeed(address(f18), 120));
        assertEq(guard.read(OTHER).s, 143.30682831e18, "18 dp passthrough");
    }

    function test_scales6DecimalsToWad() public {
        MockAggregator f6 = new MockAggregator(6, "X / USD", 143_306_828, block.timestamp);
        guard.setStock(OTHER, _cfgWithFeed(address(f6), 120));
        assertEq(guard.read(OTHER).s, 143.306828e18, "6 dp scaled to WAD");
    }

    /// @dev A feed claiming more than 18 decimals is unrepresentable. `setStock` refuses it outright rather than
    /// storing a configuration that could never produce a valid price.
    function test_rejectsFeedWithMoreThan18Decimals() public {
        MockAggregator f19 = new MockAggregator(19, "X / USD", 143, block.timestamp);
        vm.expectRevert(abi.encodeWithSelector(PriceGuardProd.PriceOutOfBounds.selector, OTHER, uint256(0)));
        guard.setStock(OTHER, _cfgWithFeed(address(f19), 120));
    }

    // ------------------------------------------------------------------ multiplier already embedded

    /// @dev Robinhood Chain feeds answer with the corporate-action multiplier already applied. A 10-for-1 split shows
    /// up as a 10x lower answer with no separate multiplier to read. The guard must publish exactly the feed answer and
    /// must not apply any further scaling beyond the decimal normalisation.
    function test_multiplierIsNotAppliedTwice() public {
        _configure(120);
        feed.setAnswer(14_330_682_831, block.timestamp); // pre-split-ish price
        uint256 before = guard.read(STOCK).s;

        // Post-split: the feed itself answers 10x lower. No multiplier is read anywhere, so the guard reports it as-is.
        feed.setAnswer(1_433_068_283, block.timestamp);
        uint256 afterSplit = guard.read(STOCK).s;

        assertEq(before, 143.30682831e18);
        assertEq(afterSplit, 14.33068283e18, "guard reports the feed answer verbatim, no second multiplier");
    }

    // ------------------------------------------------------------------ freshness

    function test_staleFeedPausesBuys() public {
        _configure(120);
        feed.setAnswer(14_330_682_831, block.timestamp - 121);
        PriceReading memory r = guard.read(STOCK);
        assertFalse(r.fresh, "121s old vs 120s window");
        assertTrue(r.buysPaused, "buys paused");
        assertEq(r.updatedAt, block.timestamp - 121, "updatedAt is the feed's, not block.timestamp");
    }

    function test_freshFeedAtExactBoundaryIsAccepted() public {
        _configure(120);
        feed.setAnswer(14_330_682_831, block.timestamp - 120);
        PriceReading memory r = guard.read(STOCK);
        assertTrue(r.fresh, "exactly at the window edge is still fresh");
        assertFalse(r.buysPaused);
    }

    function test_futureUpdatedAtIsStale() public {
        _configure(120);
        feed.setAnswer(14_330_682_831, block.timestamp + 1);
        PriceReading memory r = guard.read(STOCK);
        assertFalse(r.fresh, "a clock ahead of ours is not evidence of freshness");
        assertTrue(r.buysPaused);
    }

    function test_zeroUpdatedAtIsStale() public {
        _configure(120);
        feed.setAnswer(14_330_682_831, 0);
        PriceReading memory r = guard.read(STOCK);
        assertFalse(r.fresh);
        assertTrue(r.buysPaused);
    }

    /// @dev REGRESSION LOCK for the `.env.production.example` hazard found while closing caveats: the example env used
    /// to ship `MAX_AGE_REGULAR=90000` (25h) with the justification "equity feeds heartbeat at 86400s". That
    /// justification does not hold inside a REGULAR session: a 6-hour-old answer is not a live price, and
    /// `MAX_AGE_CLOSED` (3 days) already covers the closed-market case where `cfg.maxAgeRegular` is not consulted at
    /// all. This test pins the behaviour so the unsafe value cannot come back silently.
    function test_hazard_maxAgeRegular90000AcceptsSixHourOldPrice() public {
        _configure(90_000);
        feed.setAnswer(64_097_022_175, block.timestamp - 6 hours); // measured QQQ age on 4663
        PriceReading memory r = guard.read(STOCK);
        assertEq(uint256(r.session), uint256(SessionKind.REGULAR), "precondition: we are in a live session");
        assertTrue(r.fresh, "90000s window calls a 6h-old answer fresh");
        assertFalse(r.buysPaused, "and therefore lets buys through on it");
    }

    /// @dev Same feed data, sane window: the 6h-old answer is refused.
    function test_saneMaxAgeRegularRejectsSixHourOldPrice() public {
        _configure(300);
        feed.setAnswer(64_097_022_175, block.timestamp - 6 hours);
        PriceReading memory r = guard.read(STOCK);
        assertFalse(r.fresh);
        assertTrue(r.buysPaused);
    }

    /// @dev Closed sessions do not consult `cfg.maxAgeRegular` at all, so a long regular-session window buys nothing
    /// for weekends. This is why the 90000 value was indefensible rather than merely conservative.
    /// The guard leaves `buysPaused` false on CLOSED; `ArcumEngine._buyInternal` is what refuses CLOSED sessions
    /// (`SessionBlocksBuys`), and sells must stay open so writers can exit into the last good price.
    function test_closedSessionUsesClosedWindowNotMaxAgeRegular() public {
        // 2026-11-21 is a Saturday. 12:00 UTC = 07:00 ET.
        vm.warp(1_795_262_400);
        _configure(120);
        feed.setAnswer(14_330_682_831, block.timestamp - 2 days);
        PriceReading memory r = guard.read(STOCK);
        assertEq(uint256(r.session), uint256(SessionKind.CLOSED), "closed session");
        assertTrue(r.fresh, "2 days old is inside the 3-day closed window, not the 120s regular window");
        assertFalse(r.buysPaused, "guard itself does not pause on CLOSED; the engine refuses CLOSED buys");

        // Proof that `maxAgeRegular` is not consulted here: an answer older than any plausible regular window is still
        // accepted, and one older than the closed window is not.
        feed.setAnswer(14_330_682_831, block.timestamp - 4 days);
        assertFalse(guard.read(STOCK).fresh, "past the 3-day closed window");
    }

    // ------------------------------------------------------------------ broken feeds

    function test_incompleteRoundIsInvalid() public {
        _configure(120);
        feed.setIncompleteRound(14_330_682_831, block.timestamp);
        PriceReading memory r = guard.read(STOCK);
        assertFalse(r.fresh, "answeredInRound < roundId");
        assertTrue(r.buysPaused);
    }

    function test_zeroAnswerIsInvalid() public {
        _configure(120);
        feed.setAnswer(0, block.timestamp);
        PriceReading memory r = guard.read(STOCK);
        assertFalse(r.fresh);
        assertTrue(r.buysPaused);
    }

    function test_negativeAnswerIsInvalid() public {
        _configure(120);
        feed.setAnswer(-1, block.timestamp);
        PriceReading memory r = guard.read(STOCK);
        assertFalse(r.fresh);
        assertTrue(r.buysPaused);
    }

    function test_revertingFeedDoesNotRevertTheGuard() public {
        _configure(120);
        uint256 lastGood = guard.read(STOCK).s;
        assertEq(lastGood, 143.30682831e18, "configuration recorded a last good price");

        feed.setReverts(true);
        PriceReading memory r = guard.read(STOCK);
        assertFalse(r.fresh, "broken feed is not fresh");
        assertTrue(r.buysPaused, "broken feed pauses buys");
        assertEq(r.s, lastGood, "valuation falls back to the last good price, never invents a new one");
    }

    function test_setStockRejectsNonContractFeed() public {
        IPriceGuard.StockConfig memory cfg = _cfg(120);
        cfg.feed = address(0xDEAD);
        vm.expectRevert(abi.encodeWithSelector(PriceGuardProd.FeedNotContract.selector, address(0xDEAD)));
        guard.setStock(STOCK, cfg);
    }

    /// @dev A broken feed must be refused at configuration time, not accepted and left to fail later.
    function test_setStockRejectsRevertingFeed() public {
        feed.setReverts(true);
        vm.expectRevert();
        guard.setStock(STOCK, _cfg(120));
    }

    // ------------------------------------------------------------------ TWAP cross-check (per-stock halt semantics)

    function test_twapMismatchPausesBuysButSellsStillValue() public {
        _configure(120);
        MockReference ref = new MockReference(143.30682831e18);
        guard.setTwapReference(STOCK, IPriceReference(address(ref)), 0, 1800, 200);

        // Feed drifts 3% away from the TWAP: beyond the 2% band.
        feed.setAnswer(14_760_603_316, block.timestamp); // $147.60603316, 8 dp
        PriceReading memory r = guard.read(STOCK);
        assertTrue(r.buysPaused, "feed vs TWAP outside band pauses buys");

        // Valuation still returns the feed price so writers can exit.
        assertEq(r.s, 147.60603316e18, "valuation keeps the live feed price");
        // readLite skips the cross-check, which is why the engine uses it for valuation paths.
        assertFalse(guard.readLite(STOCK).buysPaused, "readLite skips the TWAP check");
    }

    /// @dev `setMarketHalt` is an ABI-compat shim and it raises the GLOBAL pause, so halting one stock halts all.
    /// Documented here because an operator pressing "halt NVDA" on mainnet will stop AAPL and QQQ too.
    function test_setMarketHaltIsGlobalDocumentedFootgun() public {
        MockAggregator f2 = new MockAggregator(8, "Robinhood AAPL / USD", 34_986_433_214, block.timestamp);
        guard.setStock(STOCK, _cfg(120));
        guard.setStock(OTHER, _cfgWithFeed(address(f2), 120));

        assertFalse(guard.read(OTHER).buysPaused);
        guard.setMarketHalt(STOCK, true);

        assertTrue(guard.read(STOCK).buysPaused, "named stock halted");
        assertTrue(guard.read(OTHER).buysPaused, "and every other stock with it - this is the documented footgun");
        assertTrue(guard.globalPaused(), "global pause is raised");

        // The per-stock control exists and does not leak.
        guard.setMarketHalt(STOCK, false);
        guard.setBuysPaused(STOCK, true);
        assertFalse(guard.globalPaused(), "per-stock pause leaves the global flag alone");
        assertTrue(guard.read(STOCK).buysPaused);
        assertFalse(guard.read(OTHER).buysPaused);
    }

    // ------------------------------------------------------------------ internals

    function _cfgWithFeed(address feed_, uint32 maxAgeRegular) internal pure returns (IPriceGuard.StockConfig memory) {
        return IPriceGuard.StockConfig({
            feed: feed_,
            multiplierEmbedded: true,
            maxAgeRegular: maxAgeRegular,
            maxAgeExtended: 900,
            continuityBps: 0,
            enabled: true
        });
    }
}

/// @dev Minimal `IPriceReference` used to exercise the TWAP cross-check.
contract MockReference is IPriceReference {
    uint256 public price;

    constructor(uint256 price_) {
        price = price_;
    }

    function referencePrice(address, uint24) external view override returns (uint256) {
        return price;
    }
}
