// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IPriceReference} from "./interfaces/IPriceReference.sol";

/// @title KeeperTwapReference
/// @notice Time-weighted average price built from keeper-posted observations, for chains where no DEX pool exists to
/// read a tick accumulator from.
/// @dev Why this exists: `UniswapV3TwapReference` is only meaningful on a chain that has a Uniswap v3 pool for
/// stock/USDG. Robinhood Chain Testnet (46630) has none — the canonical Uniswap v3 factory addresses hold no code — so
/// the testnet "TWAP" previously wrapped the WriterPool proxy itself, which cannot answer `getPool` and always returned
/// zero. This contract keeps the same `IPriceReference` interface but sources the average from keeper observations:
///
///   - the keeper posts (stock, priceWad) at most once per `minInterval`, so one actor cannot fill history,
///   - `referencePrice` integrates linearly between observations over a fixed `window`,
///   - an observation older than `window` makes the reference return 0 (stale). Callers must read 0 as "no reference
///     available", never as a price of zero.
///
/// This is a manipulation-resistant average of our published prices, not of executed trades. It must not be described
/// as a market TWAP.
contract KeeperTwapReference is IPriceReference, Ownable2Step {
    uint16 public constant MAX_OBSERVATIONS = 64;

    /// @dev 1e-6 .. 1e9 USD per whole token, so a fat-fingered keeper cannot post 1 wei or 1e30.
    uint256 public constant MIN_PRICE_WAD = 1e12;
    uint256 public constant MAX_PRICE_WAD = 1e27;

    struct Observation {
        uint64 ts;
        uint192 priceWad; // WAD USD per whole stock token
    }

    struct Ring {
        Observation[64] obs; // circular, `head` is the newest slot
        uint16 head;
        uint16 count;
    }

    /// @notice Averaging window in seconds.
    uint32 public immutable window;
    /// @notice Minimum gap between two posts for the same stock, in seconds.
    uint32 public immutable minInterval;

    mapping(address => bool) public isKeeper;
    mapping(address => Ring) private _rings;

    event KeeperSet(address indexed keeper, bool allowed);
    event Posted(address indexed stock, uint256 priceWad, uint64 ts, uint16 observations);

    error NotKeeper(address caller);
    error InvalidParams();
    error PostTooSoon(uint256 earliest, uint256 nowTs);
    error PriceOutOfBounds(uint256 priceWad);

    constructor(uint32 window_, uint32 minInterval_) Ownable(msg.sender) {
        if (window_ == 0 || minInterval_ == 0 || minInterval_ >= window_) revert InvalidParams();
        window = window_;
        minInterval = minInterval_;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setKeeper(address keeper, bool allowed) external onlyOwner {
        if (keeper == address(0)) revert InvalidParams();
        isKeeper[keeper] = allowed;
        emit KeeperSet(keeper, allowed);
    }

    // ---------------------------------------------------------------------
    // Keeper
    // ---------------------------------------------------------------------

    /// @notice Post one observation. Reverts when the keeper is early, so history cannot be spammed.
    function post(address stock, uint192 priceWad) public {
        if (!isKeeper[msg.sender]) revert NotKeeper(msg.sender);
        _post(stock, priceWad);
    }

    /// @notice Batch update so a keeper can refresh a whole watchlist in one transaction.
    function postMany(address[] calldata stocks, uint192[] calldata prices) external {
        if (stocks.length != prices.length) revert InvalidParams();
        if (!isKeeper[msg.sender]) revert NotKeeper(msg.sender);
        for (uint256 i = 0; i < stocks.length; ++i) {
            _post(stocks[i], prices[i]);
        }
    }

    function _post(address stock, uint192 priceWad) private {
        if (stock == address(0)) revert InvalidParams();
        if (priceWad < MIN_PRICE_WAD || priceWad > MAX_PRICE_WAD) revert PriceOutOfBounds(priceWad);

        Ring storage r = _rings[stock];
        if (r.count > 0) {
            uint256 earliest = uint256(r.obs[r.head].ts) + minInterval;
            if (block.timestamp < earliest) revert PostTooSoon(earliest, block.timestamp);
        }

        uint16 next = r.count == 0 ? 0 : uint16((uint256(r.head) + 1) % MAX_OBSERVATIONS);
        r.obs[next] = Observation({ts: uint64(block.timestamp), priceWad: priceWad});
        r.head = next;
        if (r.count < MAX_OBSERVATIONS) r.count += 1;

        emit Posted(stock, priceWad, uint64(block.timestamp), r.count);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @inheritdoc IPriceReference
    /// @dev `fee` is ignored: with no pool there is no fee tier to select.
    function referencePrice(address stock, uint24) external view override returns (uint256 priceWad) {
        (priceWad,) = twap(stock);
    }

    /// @notice TWAP over `window`, plus whether it is fresh and backed by at least two observations.
    function twap(address stock) public view returns (uint256 priceWad, bool ok) {
        Ring storage r = _rings[stock];
        uint16 count = r.count;
        if (count < 2) return (0, false);

        uint64 nowTs = uint64(block.timestamp);
        uint64 newestTs = r.obs[r.head].ts;
        if (newestTs > nowTs) return (0, false);
        if (nowTs - newestTs > window) return (0, false); // stale

        uint64 start = nowTs > window ? nowTs - window : 0;

        // Collect the slice of history touching [start, nowTs], newest first.
        uint256[64] memory ts;
        uint256[64] memory px;
        uint16 n;
        uint16 idx = r.head;
        for (uint16 i = 0; i < count; ++i) {
            Observation storage o = r.obs[idx];
            ts[n] = o.ts;
            px[n] = o.priceWad;
            n += 1;
            if (o.ts <= start) break;
            idx = idx == 0 ? MAX_OBSERVATIONS - 1 : idx - 1;
        }

        // The oldest collected observation must reach back to the window start, otherwise the average would cover a
        // shorter period than advertised.
        if (ts[n - 1] > start) return (0, false);

        // Price at window start, interpolated between the two observations straddling it.
        uint256 prevPrice = px[n - 1];
        if (n >= 2 && ts[n - 2] > start) {
            uint256 p0 = px[n - 1];
            uint256 p1 = px[n - 2];
            uint256 t0 = ts[n - 1];
            uint256 t1 = ts[n - 2];
            prevPrice = p0 + ((p1 - p0) * (uint256(start) - t0)) / (t1 - t0);
        }

        uint256 area;
        uint256 span;
        uint256 prevTs = start;

        for (uint16 k = n - 1; k > 0; --k) {
            uint256 segTs = ts[k - 1];
            uint256 segPrice = px[k - 1];
            if (segTs > nowTs) {
                segTs = nowTs;
                segPrice = px[k - 1];
            }
            if (segTs > prevTs) {
                area += ((prevPrice + segPrice) / 2) * (segTs - prevTs);
                span += segTs - prevTs;
            }
            prevTs = segTs;
            prevPrice = segPrice;
        }

        if (prevTs < nowTs) {
            area += prevPrice * (nowTs - prevTs);
            span += nowTs - prevTs;
        }

        if (span == 0) return (0, false);
        priceWad = area / span;
        ok = priceWad > 0;
    }

    /// @notice Stored observation count for a stock (saturates at MAX_OBSERVATIONS).
    function observationCount(address stock) external view returns (uint16) {
        return _rings[stock].count;
    }

    /// @notice Newest observation for a stock.
    function latest(address stock) external view returns (uint64 ts, uint192 priceWad) {
        Ring storage r = _rings[stock];
        if (r.count == 0) return (0, 0);
        Observation storage o = r.obs[r.head];
        return (o.ts, o.priceWad);
    }
}