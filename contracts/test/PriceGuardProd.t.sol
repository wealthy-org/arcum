// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PriceGuardProd, IPriceFeedV3} from "../src/PriceGuardProd.sol";
import {IPriceGuard} from "../src/interfaces/IPriceGuard.sol";
import {IPriceReference} from "../src/interfaces/IPriceReference.sol";
import {PriceReading, SessionKind} from "../src/libs/OptionTypes.sol";

contract MockFeedV3 is IPriceFeedV3 {
    uint8 private _decimals;
    int256 public answer;
    uint256 public updatedAt;
    uint80 public roundId;
    uint80 public answeredInRound;
    bool public shouldRevert;

    constructor(uint8 decimals_, int256 answer_) {
        _decimals = decimals_;
        answer = answer_;
        roundId = 1;
        answeredInRound = 1;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function setAnswer(int256 answer_) external {
        answer = answer_;
    }

    function setUpdatedAt(uint256 ts) external {
        updatedAt = ts;
    }

    function setRounds(uint80 roundId_, uint80 answeredInRound_) external {
        roundId = roundId_;
        answeredInRound = answeredInRound_;
    }

    function setRevert(bool v) external {
        shouldRevert = v;
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        require(!shouldRevert, "feed reverted");
        return (roundId, answer, updatedAt, updatedAt, answeredInRound);
    }
}

contract MockReference is IPriceReference {
    uint256 public price;

    constructor(uint256 price_) {
        price = price_;
    }

    function setPrice(uint256 price_) external {
        price = price_;
    }

    function referencePrice(address, uint24) external view override returns (uint256) {
        return price;
    }
}

contract RevertingReference is IPriceReference {
    function referencePrice(address, uint24) external pure override returns (uint256) {
        revert("no twap");
    }
}

contract PriceGuardProdTest is Test {
    PriceGuardProd internal guard;
    MockFeedV3 internal feed;

    address internal constant STOCK = address(0xA11CE);

    function setUp() public {
        guard = new PriceGuardProd();
        feed = new MockFeedV3(8, 14_250_000_000); // $142.50 with 8 decimals
        feed.setUpdatedAt(block.timestamp);
    }

    // ------------------------------------------------------------------ helpers

    function _daysFromCivil(int256 y, uint256 m, uint256 d) internal pure returns (int256) {
        if (m <= 2) y -= 1;
        int256 era = (y >= 0 ? y : y - 399) / 400;
        uint256 yoe = uint256(y - era * 400);
        uint256 mp = m > 2 ? m - 3 : m + 9;
        uint256 doy = (153 * mp + 2) / 5 + d - 1;
        int256 doe = int256(yoe) * 365 + int256(yoe / 4) - int256(yoe / 100) + int256(doy);
        return era * 146_097 + doe - 71_9468;
    }

    function _utc(uint256 y, uint256 m, uint256 d, uint256 h, uint256 min) internal pure returns (uint256) {
        return uint256(_daysFromCivil(int256(y), m, d)) * 86_400 + h * 3600 + min * 60;
    }

    function _cfg(uint32 maxAgeRegular, uint32 maxAgeExtended, uint16 continuityBps)
        internal
        view
        returns (IPriceGuard.StockConfig memory)
    {
        return IPriceGuard.StockConfig({
            feed: address(feed),
            multiplierEmbedded: true,
            maxAgeRegular: maxAgeRegular,
            maxAgeExtended: maxAgeExtended,
            continuityBps: continuityBps,
            enabled: true
        });
    }

    function _configure() internal {
        guard.setStock(STOCK, _cfg(120, 900, 0));
    }

    // ------------------------------------------------------------------ price scaling

    function test_read_scalesFeedToWad() public {
        _configure();
        feed.setUpdatedAt(block.timestamp);
        PriceReading memory r = guard.read(STOCK);
        assertEq(r.s, 142.5e18, "price scaled to WAD");
        assertTrue(r.fresh, "fresh");
        assertFalse(r.buysPaused, "not paused");
    }

    function test_read_supports18DecimalFeed() public {
        MockFeedV3 f18 = new MockFeedV3(18, 584.2e18);
        f18.setUpdatedAt(block.timestamp);
        guard.setStock(STOCK, IPriceGuard.StockConfig(address(f18), true, 120, 900, 0, true));

        PriceReading memory r = guard.read(STOCK);
        assertEq(r.s, 584.2e18, "18 decimal feed unchanged");
    }

    function test_read_supports6DecimalFeed() public {
        MockFeedV3 f6 = new MockFeedV3(6, 142_500_000);
        f6.setUpdatedAt(block.timestamp);
        guard.setStock(STOCK, IPriceGuard.StockConfig(address(f6), true, 120, 900, 0, true));

        assertEq(guard.read(STOCK).s, 142.5e18, "6 decimal feed scaled");
    }

    // ------------------------------------------------------------------ staleness

    function test_read_staleFeedPausesBuysButKeepsValuation() public {
        _configure();
        feed.setUpdatedAt(block.timestamp);
        guard.poke(STOCK);

        // 10 minutes later in a REGULAR session: max age is 120s.
        vm.warp(_utc(2026, 7, 15, 15, 0)); // 11:00 ET on a Wednesday
        feed.setUpdatedAt(block.timestamp - 600);

        PriceReading memory r = guard.read(STOCK);
        assertFalse(r.fresh, "stale");
        assertTrue(r.buysPaused, "buys blocked on stale feed");
        assertEq(r.s, 142.5e18, "valuation uses last good price so writers can exit");
    }

    function test_read_zeroUpdatedAtIsStale() public {
        _configure();
        feed.setUpdatedAt(0);
        PriceReading memory r = guard.read(STOCK);
        assertFalse(r.fresh, "missing timestamp is stale");
        assertTrue(r.buysPaused, "paused");
    }

    function test_read_futureUpdatedAtIsStale() public {
        _configure();
        feed.setUpdatedAt(block.timestamp + 60);
        assertFalse(guard.read(STOCK).fresh, "future timestamp rejected");
    }

    function test_read_extendedSessionUsesLongerMaxAge() public {
        _configure();
        vm.warp(_utc(2026, 7, 15, 12, 0)); // 08:00 ET pre-market => EXTENDED
        assertEq(uint256(guard.getMarketSession()), uint256(SessionKind.EXTENDED));
        feed.setUpdatedAt(block.timestamp - 600); // 10 min: stale in REGULAR, fresh in EXTENDED

        PriceReading memory r = guard.read(STOCK);
        assertTrue(r.fresh, "extended tolerance");
        assertFalse(r.buysPaused, "buyable in pre-market");
    }

    // ------------------------------------------------------------------ broken feeds

    function test_read_revertingFeedDoesNotRevert() public {
        _configure();
        feed.setUpdatedAt(block.timestamp);
        feed.setRevert(true);

        PriceReading memory r = guard.read(STOCK);
        assertFalse(r.fresh, "reverting feed is stale");
        assertTrue(r.buysPaused, "paused");
    }

    function test_read_incompleteRoundIsStale() public {
        _configure();
        feed.setUpdatedAt(block.timestamp);
        feed.setRounds(5, 4); // answeredInRound < roundId = incomplete round
        assertFalse(guard.read(STOCK).fresh, "incomplete round rejected");
    }

    function test_read_negativeAnswerIsStale() public {
        _configure();
        feed.setUpdatedAt(block.timestamp);
        feed.setAnswer(-1);
        assertFalse(guard.read(STOCK).fresh, "non-positive answer rejected");
    }

    function test_read_unknownStockReverts() public {
        vm.expectRevert(abi.encodeWithSelector(IPriceGuard.StockUnknown.selector, STOCK));
        guard.read(STOCK);
    }

    // ------------------------------------------------------------------ admin guards

    function test_setStock_rejectsZeroAddressStock() public {
        vm.expectRevert(PriceGuardProd.ZeroAddress.selector);
        guard.setStock(address(0), _cfg(120, 900, 0));
    }

    function test_setStock_rejectsNonContractFeed() public {
        vm.expectRevert(abi.encodeWithSelector(PriceGuardProd.FeedNotContract.selector, address(0xDEAD)));
        guard.setStock(STOCK, IPriceGuard.StockConfig(address(0xDEAD), true, 120, 900, 0, true));
    }

    function test_setStock_continuityBreachPausesBuys() public {
        _configure();
        feed.setUpdatedAt(block.timestamp);
        guard.poke(STOCK);

        // 4x price move with 2000 bps continuity limit => pause, do not silently accept.
        feed.setAnswer(57_000_000_000); // $570.00
        guard.setStock(STOCK, _cfg(120, 900, 2000));

        assertTrue(guard.read(STOCK).buysPaused, "continuity breach pauses buys");
        guard.setBuysPaused(STOCK, false);
        assertFalse(guard.read(STOCK).buysPaused, "operator can clear after review");
    }

    function test_setStock_onlyOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        guard.setStock(STOCK, _cfg(120, 900, 0));
    }

    function test_globalPauseBlocksBuys() public {
        _configure();
        feed.setUpdatedAt(block.timestamp);
        guard.setGlobalPause(true);

        PriceReading memory r = guard.read(STOCK);
        assertTrue(r.buysPaused, "global pause blocks buys");
        assertEq(uint256(r.session), uint256(SessionKind.HALTED), "session reported as halted");
        assertTrue(r.s > 0, "valuation still available");
    }

    // ------------------------------------------------------------------ TWAP cross-check

    function test_twap_withinBandAllowsBuys() public {
        _configure();
        feed.setUpdatedAt(block.timestamp);
        MockReference ref = new MockReference(142.5e18);
        guard.setTwapReference(STOCK, ref, 500, 1800, 200);

        vm.warp(_utc(2026, 7, 15, 15, 0)); // REGULAR session
        feed.setUpdatedAt(block.timestamp);

        assertFalse(guard.read(STOCK).buysPaused, "match => buyable");
    }

    function test_twap_outsideBandPausesBuys() public {
        _configure();
        MockReference ref = new MockReference(100e18); // 40% away from 142.50
        guard.setTwapReference(STOCK, ref, 500, 1800, 200);

        vm.warp(_utc(2026, 7, 15, 15, 0));
        feed.setUpdatedAt(block.timestamp);

        assertTrue(guard.read(STOCK).buysPaused, "deviation pauses buys");
        (, bool ok) = guard.twapCheck(STOCK);
        assertFalse(ok, "twapCheck reports not ok");
    }

    function test_twap_unavailablePausesBuys() public {
        _configure();
        RevertingReference ref = new RevertingReference();
        guard.setTwapReference(STOCK, ref, 500, 1800, 200);

        vm.warp(_utc(2026, 7, 15, 15, 0));
        feed.setUpdatedAt(block.timestamp);

        assertTrue(guard.read(STOCK).buysPaused, "unreadable TWAP pauses buys");
    }

    function test_twap_ignoredOutsideTradingSessions() public {
        _configure();
        MockReference ref = new MockReference(1e18); // wildly off
        guard.setTwapReference(STOCK, ref, 500, 1800, 200);

        vm.warp(_utc(2026, 7, 18, 15, 0)); // Saturday => CLOSED
        feed.setUpdatedAt(block.timestamp);
        guard.setBuysPaused(STOCK, false);

        PriceReading memory r = guard.read(STOCK);
        assertEq(uint256(r.session), uint256(SessionKind.CLOSED), "closed");
        assertFalse(r.buysPaused, "twap band not applied when closed");
    }

    // ------------------------------------------------------------------ sessions / DST

    function test_session_dstSummer() public {
        // 2026-07-15 14:00 UTC = 10:00 ET (EDT, UTC-4) => REGULAR
        assertEq(uint256(guard.sessionAt(_utc(2026, 7, 15, 14, 0))), uint256(SessionKind.REGULAR));
    }

    function test_session_standardTimeWinter() public {
        // 2026-01-14 14:30 UTC = 09:30 ET (EST, UTC-5) => REGULAR
        assertEq(uint256(guard.sessionAt(_utc(2026, 1, 14, 14, 30))), uint256(SessionKind.REGULAR));
        // 2026-01-14 14:00 UTC = 09:00 ET => EXTENDED (pre-market)
        assertEq(uint256(guard.sessionAt(_utc(2026, 1, 14, 14, 0))), uint256(SessionKind.EXTENDED));
    }

    function test_session_dstWouldBeWrongWithFixedOffset() public {
        // 2026-07-15 13:35 UTC = 09:35 ET under EDT. A fixed UTC-5 assumption would call this 08:35 = EXTENDED.
        assertEq(uint256(guard.sessionAt(_utc(2026, 7, 15, 13, 35))), uint256(SessionKind.REGULAR));
    }

    function test_session_dstBoundaries() public {
        // DST 2026 starts second Sunday of March (8th) 07:00 UTC.
        assertEq(uint256(guard.sessionAt(_utc(2026, 3, 8, 6, 59))), uint256(SessionKind.CLOSED));
        // DST 2026 ends first Sunday of November (1st) 06:00 UTC.
        assertEq(uint256(guard.sessionAt(_utc(2026, 11, 1, 6, 30))), uint256(SessionKind.CLOSED));
    }

    function test_session_weekendClosed() public {
        assertEq(uint256(guard.sessionAt(_utc(2026, 7, 18, 16, 0))), uint256(SessionKind.CLOSED));
        assertEq(uint256(guard.sessionAt(_utc(2026, 7, 19, 16, 0))), uint256(SessionKind.CLOSED));
    }

    function test_session_afterHoursExtended() public {
        // 2026-07-15 21:30 UTC = 17:30 ET => EXTENDED
        assertEq(uint256(guard.sessionAt(_utc(2026, 7, 15, 21, 30))), uint256(SessionKind.EXTENDED));
        // 2026-07-15 01:00 UTC = 21:00 ET previous day => CLOSED
        assertEq(uint256(guard.sessionAt(_utc(2026, 7, 15, 1, 0))), uint256(SessionKind.CLOSED));
    }

    // ------------------------------------------------------------------ ownership

    function test_ownership_isTwoStep() public {
        address newOwner = address(0xCAFE);
        guard.transferOwnership(newOwner);

        assertEq(guard.owner(), address(this), "owner unchanged until accepted");
        vm.prank(newOwner);
        guard.acceptOwnership();
        assertEq(guard.owner(), newOwner, "ownership transferred");
    }

    function test_readLite_skipsTwapCheck() public {
        _configure();
        MockReference ref = new MockReference(1e18);
        guard.setTwapReference(STOCK, ref, 500, 1800, 200);

        vm.warp(_utc(2026, 7, 15, 15, 0));
        feed.setUpdatedAt(block.timestamp);

        assertTrue(guard.read(STOCK).buysPaused, "full read applies TWAP band");
        assertFalse(guard.readLite(STOCK).buysPaused, "lite read used for valuation ignores TWAP");
    }
}