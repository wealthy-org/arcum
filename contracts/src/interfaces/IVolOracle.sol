// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {VolReading} from "../libs/OptionTypes.sol";

/// @title IVolOracle
/// @notice Source of the implied volatility the engine prices with. Until this oracle is set, the engine falls back to a
/// hardcoded 50% IV — acceptable for staging, never for production money.
interface IVolOracle {
    event VolPosted(address indexed stock, uint64 sigmaBps, uint64 skewK, uint64 eventBumpBps, uint64 validUntil, address indexed publisher);
    event VolConfigSet(address indexed stock, uint64 minSigmaBps, uint64 maxSigmaBps, uint32 maxAge, uint32 minTtl, bool enabled);
    event PublisherSet(address indexed publisher, bool allowed);
    event VolFailClosed(address indexed stock, bytes32 reason);

    error NotPublisher(address caller);
    error StockNotConfigured(address stock);
    error SigmaOutOfBounds(uint64 sigmaBps, uint64 minSigmaBps, uint64 maxSigmaBps);
    error TtlTooShort(uint64 validUntil, uint256 minValidUntil);
    error ValidUntilInPast(uint64 validUntil);
    error HorizonTooLong(uint64 validUntil, uint256 maxValidUntil);

    struct VolConfig {
        uint64 minSigmaBps; // sanity floor, e.g. 500 = 5%
        uint64 maxSigmaBps; // sanity cap, e.g. 30000 = 300%
        uint32 maxAge; // longest accepted validUntil - now, seconds
        uint32 minTtl; // shortest accepted validUntil - now, seconds
        bool enabled;
    }

    /// @notice Full reading as last posted (never reverts for unknown stocks).
    function vol(address stock) external view returns (VolReading memory);

    /// @notice Sigma the engine may price with, plus whether it is currently safe to trade on it.
    /// @dev Returns the last posted sigma even when stale so that accrual/valuation keep using the last good value;
    /// `ok` is false when the reading is unset, expired, disabled, or outside its configured sanity bounds.
    function sigmaFor(address stock) external view returns (uint64 sigmaBps, bool ok);

    /// @notice True while the posted earnings blackout window for `stock` covers block.timestamp.
    function inEventWindow(address stock) external view returns (bool);

    function config(address stock) external view returns (VolConfig memory);

    function isPublisher(address account) external view returns (bool);

    /// @notice Publisher-only. Post a signed-by-our-keeper volatility reading for one stock.
    function post(address stock, VolReading calldata reading) external;

    /// @notice Publisher-only batch, capped per call to keep gas predictable.
    function postMany(address[] calldata stocks, VolReading[] calldata readings) external;

    /// @notice Admin. Set the sanity bounds and freshness window for one stock.
    function setVolConfig(address stock, VolConfig calldata cfg) external;

    /// @notice Admin. Grant/revoke a keeper key that may post.
    function setPublisher(address account, bool allowed) external;
}