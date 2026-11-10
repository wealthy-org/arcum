// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title FixedMath
/// @notice Fixed-point WAD (18 decimals) arithmetic library for Arcum protocol.
library FixedMath {
    uint256 internal constant WAD = 1e18;
    int256 internal constant SIGNED_WAD = 1e18;

    error MathOverflow();
    error ZeroDivision();

    function wadMul(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y + WAD / 2) / WAD;
    }

    function wadDiv(uint256 x, uint256 y) internal pure returns (uint256) {
        if (y == 0) revert ZeroDivision();
        return (x * WAD + y / 2) / y;
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function wadSqrt(uint256 x) internal pure returns (uint256) {
        return sqrt(x * WAD);
    }

    /// @dev Computes x^y in WAD approximation for y = alpha
    function wadPow(uint256 baseWad, uint256 expWad) internal pure returns (uint256) {
        if (baseWad == WAD || expWad == 0) return WAD;
        if (baseWad == 0) return 0;
        int256 lnBase = wadLn(int256(baseWad));
        int256 prod = (lnBase * int256(expWad)) / SIGNED_WAD;
        return uint256(wadExp(prod));
    }

    /// @dev Natural logarithm for WAD x
    function wadLn(int256 x) internal pure returns (int256) {
        if (x <= 0) revert MathOverflow();
        int256 result = 0;
        while (x >= 2 * SIGNED_WAD) {
            result += 693147180559945309; // ln(2) in WAD
            x = x / 2;
        }
        while (x < SIGNED_WAD / 2) {
            result -= 693147180559945309;
            x = x * 2;
        }
        int256 y = (x - SIGNED_WAD) * SIGNED_WAD / (x + SIGNED_WAD);
        int256 y2 = (y * y) / SIGNED_WAD;
        int256 term = y;
        int256 sum = term;
        for (int256 i = 3; i <= 9; i += 2) {
            term = (term * y2) / SIGNED_WAD;
            sum += term / i;
        }
        return result + 2 * sum;
    }

    /// @dev Exponential function e^x for WAD x
    function wadExp(int256 x) internal pure returns (int256) {
        if (x < -41 * SIGNED_WAD) return 0;
        if (x > 135 * SIGNED_WAD) revert MathOverflow();
        int256 LN2 = 693147180559945309; // ln(2) in WAD
        int256 k = x / LN2;
        int256 r = x - k * LN2;
        int256 term = SIGNED_WAD;
        int256 sum = term;
        for (int256 i = 1; i <= 12; ++i) {
            term = (term * r) / (i * SIGNED_WAD);
            sum += term;
        }
        if (k >= 0) {
            return sum << uint256(k);
        } else {
            return sum >> uint256(-k);
        }
    }
}
