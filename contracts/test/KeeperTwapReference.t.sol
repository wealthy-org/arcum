// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {KeeperTwapReference} from "../src/KeeperTwapReference.sol";

/// @notice Averages must be checkable by hand, so every expectation below is written as an explicit number.
contract KeeperTwapReferenceTest is Test {
    KeeperTwapReference twapRef;

    address stock = makeAddr("stock");
    address keeper = address(0xBEEF);
    address stranger = address(0xCAFE);
    uint32 constant WINDOW = 3600;
    uint32 constant MIN_INTERVAL = 300;

    function setUp() public {
        vm.warp(1_000_000);
        twapRef = new KeeperTwapReference(WINDOW, MIN_INTERVAL);
        twapRef.setKeeper(keeper, true);
    }

    function test_singleObservationIsNotAReference() public {
        vm.prank(keeper);
        twapRef.post(stock, 100e18);
        (uint256 price, bool ok) = twapRef.twap(stock);
        assertEq(price, 0, "one observation is not enough for an average");
        assertFalse(ok);
        assertEq(twapRef.referencePrice(stock, 0), 0);
    }

    function test_averageIsLinearThenFlat() public {
        vm.prank(keeper);
        twapRef.post(stock, 100e18); // t0

        vm.warp(1_000_000 + 1800);
        vm.prank(keeper);
        twapRef.post(stock, 300e18); // t0 + 1800

        vm.warp(1_000_000 + WINDOW); // exactly one window after the first post
        (uint256 price, bool ok) = twapRef.twap(stock);
        // [t0, t0+1800]: linear 100 -> 300, mean 200. [t0+1800, t0+3600]: flat 300.
        // (200*1800 + 300*1800) / 3600 = 250.
        assertEq(price, 250e18);
        assertTrue(ok);
    }

    function test_staleHistoryReturnsZeroNotOldPrice() public {
        vm.prank(keeper);
        twapRef.post(stock, 100e18);
        vm.warp(1_000_000 + 1800);
        vm.prank(keeper);
        twapRef.post(stock, 300e18);

        vm.warp(1_000_000 + 1800 + WINDOW + 1);
        (uint256 price, bool ok) = twapRef.twap(stock);
        assertEq(price, 0, "a reference older than the window must read as unavailable");
        assertFalse(ok);
    }

    function test_shortHistoryWithinWindowIsRejected() public {
        // Two posts, but the older one is inside the window: the advertised period would be a lie.
        vm.warp(1_000_000 + 3000);
        vm.prank(keeper);
        twapRef.post(stock, 100e18);
        vm.warp(1_000_000 + 3400);
        vm.prank(keeper);
        twapRef.post(stock, 300e18);
        (uint256 price, bool ok) = twapRef.twap(stock);
        assertEq(price, 0);
        assertFalse(ok);
    }

    function test_singleSpikeIsDiluted() public {
        vm.startPrank(keeper);
        twapRef.post(stock, 100e18);
        vm.warp(1_000_000 + 300);
        twapRef.post(stock, 100e18);
        vm.warp(1_000_000 + 600);
        twapRef.post(stock, 100e18);
        vm.warp(1_000_000 + 900);
        twapRef.post(stock, 1000e18); // one bad print
        vm.warp(1_000_000 + 1200);
        twapRef.post(stock, 100e18);
        vm.stopPrank();

        vm.warp(1_000_000 + WINDOW);
        (uint256 price, bool ok) = twapRef.twap(stock);
        assertTrue(ok);
        assertLt(price, 300e18, "one spike inside a 3600s window must not move the average by more than a sixth");
        assertGt(price, 100e18, "the spike must still register, dilution is not deletion");
    }

    function test_rateLimitBlocksHistorySpam() public {
        vm.prank(keeper);
        twapRef.post(stock, 100e18);
        vm.warp(1_000_000 + MIN_INTERVAL - 1);
        vm.prank(keeper);
        vm.expectRevert(
            abi.encodeWithSelector(KeeperTwapReference.PostTooSoon.selector, 1_000_000 + MIN_INTERVAL, block.timestamp)
        );
        twapRef.post(stock, 100e18);

        vm.warp(1_000_000 + MIN_INTERVAL);
        vm.prank(keeper);
        twapRef.post(stock, 100e18);
        assertEq(twapRef.observationCount(stock), 2);
    }

    function test_onlyKeeperMayPost() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(KeeperTwapReference.NotKeeper.selector, stranger));
        twapRef.post(stock, 100e18);
    }

    function test_priceBoundsRejectFatFinger() public {
        vm.startPrank(keeper);
        vm.expectRevert(abi.encodeWithSelector(KeeperTwapReference.PriceOutOfBounds.selector, 1));
        twapRef.post(stock, 1);

        vm.expectRevert(abi.encodeWithSelector(KeeperTwapReference.PriceOutOfBounds.selector, uint192(1e28)));
        twapRef.post(stock, 1e28);
        vm.stopPrank();
    }

    function test_ringKeepsNewestObservationsAndStaysBounded() public {
        uint16 cap = twapRef.MAX_OBSERVATIONS();
        // Local clock: Foundry 1.8 keeps the pre-warp value of `block.timestamp` inside the same frame.
        uint256 clock = block.timestamp;
        for (uint16 i = 0; i < cap + 5; ++i) {
            vm.prank(keeper);
            twapRef.post(stock, uint192((uint256(100) + i) * 1e18));
            clock += MIN_INTERVAL;
            vm.warp(clock);
        }
        assertEq(twapRef.observationCount(stock), cap, "ring must saturate, not grow");
        (uint64 ts, uint192 px) = twapRef.latest(stock);
        assertEq(uint256(px), (uint256(100) + cap + 4) * 1e18);
        assertEq(uint256(ts), clock - MIN_INTERVAL);
    }

    function test_postManyStopsAtFirstInvalid() public {
        address[] memory stocks = new address[](2);
        uint192[] memory prices = new uint192[](2);
        stocks[0] = stock;
        stocks[1] = address(0);
        prices[0] = 100e18;
        prices[1] = 100e18;
        vm.prank(keeper);
        vm.expectRevert(KeeperTwapReference.InvalidParams.selector);
        twapRef.postMany(stocks, prices);
    }

    function test_constructorRejectsNonsense() public {
        vm.expectRevert(KeeperTwapReference.InvalidParams.selector);
        new KeeperTwapReference(0, 60);
        vm.expectRevert(KeeperTwapReference.InvalidParams.selector);
        new KeeperTwapReference(60, 60);
        vm.expectRevert(KeeperTwapReference.InvalidParams.selector);
        new KeeperTwapReference(60, 0);
    }
}