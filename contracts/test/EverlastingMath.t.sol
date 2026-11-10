// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {EverlastingMath} from "../src/libs/EverlastingMath.sol";
import {EverlastingGreeks} from "../src/libs/EverlastingGreeks.sol";
import {Funding} from "../src/libs/Funding.sol";

contract EverlastingMathTest is Test {
    uint256 constant WAD = 1e18;
    uint64 constant DAILY_TAU = 86400;
    uint64 constant WEEKLY_TAU = 604800;
    uint64 constant SIGMA_50 = 5000; // 50% IV

    function testAlphaCalculation() public pure {
        uint256 alphaDaily = EverlastingMath.calculateAlpha(SIGMA_50, DAILY_TAU);
        uint256 alphaWeekly = EverlastingMath.calculateAlpha(SIGMA_50, WEEKLY_TAU);

        // Shorter tau (higher funding frequency) implies larger characteristic parameter
        assertTrue(alphaDaily > WAD, "Alpha daily must be > 1");
        assertTrue(alphaWeekly > WAD, "Alpha weekly must be > 1");
        assertTrue(alphaDaily > alphaWeekly, "Daily alpha must exceed weekly alpha");
    }

    function testAtTheMoneySymmetry() public pure {
        uint256 spot = 100 * WAD;
        uint256 strike = 100 * WAD;

        uint256 callPrice = EverlastingMath.price(spot, strike, SIGMA_50, DAILY_TAU, true);
        uint256 putPrice = EverlastingMath.price(spot, strike, SIGMA_50, DAILY_TAU, false);

        // At the money (S = K), call and put prices must be exactly identical
        assertEq(callPrice, putPrice, "ATM Call and Put prices must be equal");
        assertTrue(callPrice > 0, "Price must be strictly positive");
    }

    function testCallPutParity() public pure {
        uint256 spot = 120 * WAD;
        uint256 strike = 100 * WAD;

        uint256 callPrice = EverlastingMath.price(spot, strike, SIGMA_50, DAILY_TAU, true);
        uint256 putPrice = EverlastingMath.price(spot, strike, SIGMA_50, DAILY_TAU, false);

        // Parity: Call - Put = S - K (when S > K)
        uint256 diff = callPrice - putPrice;
        uint256 expected = spot - strike;

        assertApproxEqAbs(diff, expected, 1e14, "Call-Put parity violated for ITM Call");
    }

    function testPutCallParityOTM() public pure {
        uint256 spot = 80 * WAD;
        uint256 strike = 100 * WAD;

        uint256 callPrice = EverlastingMath.price(spot, strike, SIGMA_50, DAILY_TAU, true);
        uint256 putPrice = EverlastingMath.price(spot, strike, SIGMA_50, DAILY_TAU, false);

        // Parity: Put - Call = K - S (when S < K)
        uint256 diff = putPrice - callPrice;
        uint256 expected = strike - spot;

        assertApproxEqAbs(diff, expected, 1e14, "Call-Put parity violated for ITM Put");
    }

    function testGreeksBounds() public pure {
        uint256 spot = 100 * WAD;
        uint256 strike = 100 * WAD;

        int256 callDelta = EverlastingGreeks.delta(spot, strike, SIGMA_50, DAILY_TAU, true);
        int256 putDelta = EverlastingGreeks.delta(spot, strike, SIGMA_50, DAILY_TAU, false);

        assertTrue(callDelta > 0 && callDelta < int256(WAD), "Call delta must be in (0, 1)");
        assertTrue(putDelta < 0 && putDelta > -int256(WAD), "Put delta must be in (-1, 0)");
        assertApproxEqAbs(uint256(callDelta - putDelta), WAD, 1e14, "Delta spread must equal 1 WAD");
    }

    function testFundingNormDecay() public pure {
        uint128 initialNorm = uint128(WAD);
        uint256 vMark = 10 * WAD;
        uint256 payoff = 0; // OTM option: 100% time value
        uint64 elapsed = 3600; // 1 hour

        uint128 newNorm = Funding.accrueNorm(initialNorm, vMark, payoff, DAILY_TAU, elapsed);

        assertTrue(newNorm < initialNorm, "Norm must decrease after positive elapsed time");
        assertTrue(newNorm > 0, "Norm must remain positive");
    }

    function testDifferentialVectorParity() public pure {
        // NVDA Put S=142.5, K=145.0, sigma=5200, tau=86400, isCall=false
        uint256 spot = 1425 * 1e17; // 142.5 WAD
        uint256 strike = 145 * 1e18; // 145.0 WAD
        uint256 priceSol = EverlastingMath.price(spot, strike, 5200, 86400, false);
        // Expected from closed-form Python/TS: ~$3.0603 WAD
        uint256 expectedWad = 30603 * 1e14;
        assertApproxEqAbs(priceSol, expectedWad, 1e17, "Solidity NVDA Put must match Python/TS closed form");
    }
}
