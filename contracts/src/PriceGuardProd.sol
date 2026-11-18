// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IPriceGuard} from "./interfaces/IPriceGuard.sol";
import {IPriceReference} from "./interfaces/IPriceReference.sol";
import {PriceReading, SessionKind} from "./libs/OptionTypes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @notice AggregatorV3-compatible price feed (Chainlink / Pyth-pushed / issuer oracle adapter).
interface IPriceFeedV3 {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @title PriceGuardProd
/// @notice Production IPriceGuard. Unlike `PriceGuard` (mock: hardcoded `setMockPrice`), this contract reads a real
/// AggregatorV3 feed per stock, enforces per-session staleness, honours feed pauses, and can cross-check the feed
/// against a manipulation-resistant TWAP reference before allowing buys.
/// @dev Design notes that matter operationally:
/// - Buys are blocked (`buysPaused`) whenever the feed is stale, paused, unset, or deviates from TWAP beyond band.
///   Sells are not blocked by staleness alone; they value against `lastGoodPrice` so writers can always exit.
/// - Market sessions are computed in US Eastern time with real DST rules (second Sunday of March 07:00 UTC to first
///   Sunday of November 06:00 UTC). The mock guard used a fixed UTC assumption, which drifts by one hour twice a year.
/// - Ownership is two-step: production ownership must end at a multisig/Safe, and the new owner must `acceptOwnership`.
/// - `setMockPrice` deliberately does not exist.
contract PriceGuardProd is IPriceGuard, Ownable2Step {
    uint256 private constant WAD = 1e18;
    uint256 private constant BPS = 10_000;

    uint32 public constant DEFAULT_MAX_AGE_REGULAR = 120; // 2 minutes
    uint32 public constant DEFAULT_MAX_AGE_EXTENDED = 900; // 15 minutes
    uint32 public constant MAX_AGE_CLOSED = 3 days; // weekend/holiday tolerance for valuation
    uint32 public constant DEFAULT_TWAP_WINDOW = 1800; // 30 minutes
    uint16 public constant DEFAULT_TWAP_BAND_BPS = 200; // 2%

    uint32 private constant SECONDS_PER_DAY = 86_400;
    uint32 private constant ET_DST_OFFSET = 4 hours; // UTC-4
    uint32 private constant ET_STD_OFFSET = 5 hours; // UTC-5

    struct TwapConfig {
        IPriceReference ref;// address(0) disables the cross-check
        uint24 fee;
        uint32 window;
        uint16 bandBps;
        bool enabled;
    }

    mapping(address stock => StockConfig) private _configs;
    mapping(address stock => bool) private _buysPaused;
    mapping(address stock => uint256) private _lastGoodPrices;
    mapping(address stock => uint256) private _lastGoodTimestamps;
    mapping(address stock => TwapConfig) private _twap;

    bool private _globalPaused;

    event GlobalPauseSet(bool paused);
    event TwapReferenceSet(address indexed stock, address twapRef, uint24 fee, uint32 window, uint16 bandBps);
    event FeedStale(address indexed stock, uint256 updatedAt, uint256 maxAge);
    event FeedPaused(address indexed stock, uint80 reportedRound, uint80 answeredInRound);
    event ContinuityBreach(address indexed stock, uint256 previous, uint256 current, uint16 continuityBps);

    error ZeroAddress();
    error FeedNotContract(address feed);
    error UnsupportedDecimals(uint8 decimals);
    error LengthMismatch();
    error PriceOutOfBounds(address stock, uint256 price);

    constructor() Ownable(msg.sender) {}

    // ---------------------------------------------------------------------------------------------- admin

    /// @notice Configure one stock. `cfg.feed` must be a deployed AggregatorV3 feed.
    /// @dev Rejects feeds whose `latestRoundData` reverts or returns a non-positive answer, and rejects a price move
    /// larger than `cfg.continuityBps` vs the last good price (that path pauses buys instead of silently accepting it).
    function setStock(address stock, StockConfig calldata cfg) external override onlyOwner {
        _setStock(stock, cfg);
    }

    /// @notice Batch variant of `setStock`.
    function setStocks(address[] calldata stocks, StockConfig[] calldata cfgs) external onlyOwner {
        if (stocks.length != cfgs.length) revert LengthMismatch();
        for (uint256 i; i < stocks.length; ++i) {
            _setStock(stocks[i], cfgs[i]);
        }
    }

    function _setStock(address stock, StockConfig memory cfg) internal {
        if (stock == address(0)) revert ZeroAddress();
        if (cfg.feed == address(0)) revert ZeroAddress();
        if (cfg.feed.code.length == 0) revert FeedNotContract(cfg.feed);
        if (cfg.enabled) {
            (uint256 price, , bool ok) = _feedPrice(cfg);
            if (!ok) revert PriceOutOfBounds(stock, 0);
            uint256 previous = _lastGoodPrices[stock];
            if (cfg.continuityBps > 0 && previous > 0) {
                uint256 diff = price > previous ? price - previous : previous - price;
                if (diff * BPS > previous * cfg.continuityBps) {
                    _buysPaused[stock] = true;
                    emit ContinuityBreach(stock, previous, price, cfg.continuityBps);
                }
            }
            _lastGoodPrices[stock] = price;
            _lastGoodTimestamps[stock] = block.timestamp;
        }
        _configs[stock] = cfg;
        emit StockConfigured(stock, cfg.feed, cfg.multiplierEmbedded, cfg.maxAgeRegular, cfg.maxAgeExtended);
    }

    function setBuysPaused(address stock, bool paused) external override onlyOwner {
        _buysPaused[stock] = paused;
        emit BuysPausedSet(stock, paused, paused ? bytes32("MANUAL_PAUSE") : bytes32(0));
    }

    /// @notice ABI-compatible with the mock guard. Halts buys for `stock` and raises the global halt flag.
    function setMarketHalt(address stock, bool halted) external onlyOwner {
        _buysPaused[stock] = halted;
        _globalPaused = halted;
        emit BuysPausedSet(stock, halted, halted ? bytes32("MARKET_HALT") : bytes32(0));
        emit GlobalPauseSet(halted);
    }

    /// @notice Production kill switch: blocks every buy while leaving sells and cancellation open.
    function setGlobalPause(bool paused) external onlyOwner {
        _globalPaused = paused;
        emit GlobalPauseSet(paused);
    }

    /// @inheritdoc IPriceGuard
    /// @dev `pool` is interpreted as an `IPriceReference` with fee 0 so the interface stays unchanged. Prefer
    /// `setTwapReference` for Uniswap v3 pools, which need a fee tier.
    function setTwapSource(address stock, address pool, uint32 window, uint16 bandBps) external override onlyOwner {
        _setTwap(stock, IPriceReference(pool), 0, window, bandBps);
    }

    /// @notice Uniswap v3 TWAP cross-check: pause buys when |feed/TWAP - 1| > bandBps.
    function setTwapReference(address stock, IPriceReference twapRef, uint24 fee, uint32 window, uint16 bandBps)
        external
        onlyOwner
    {
        _setTwap(stock, twapRef, fee, window, bandBps);
    }

    function _setTwap(address stock, IPriceReference twapRef, uint24 fee, uint32 window, uint16 bandBps) internal {
        _twap[stock] = TwapConfig({
            ref: twapRef,
            fee: fee,
            window: window == 0 ? DEFAULT_TWAP_WINDOW : window,
            bandBps: bandBps == 0 ? DEFAULT_TWAP_BAND_BPS : bandBps,
            enabled: address(twapRef) != address(0)
        });
        emit TwapSourceSet(stock, address(twapRef), _twap[stock].window, _twap[stock].bandBps);
        emit TwapReferenceSet(stock, address(twapRef), fee, _twap[stock].window, _twap[stock].bandBps);
    }

    // ---------------------------------------------------------------------------------------------- reads

    /// @inheritdoc IPriceGuard
    function read(address stock) external view override returns (PriceReading memory) {
        return _readInternal(stock, true);
    }

    /// @inheritdoc IPriceGuard
    /// @dev No TWAP cross-check: valuation reads stay one feed call so the engine's sell/accrual paths stay cheap.
    function readLite(address stock) external view override returns (PriceReading memory) {
        return _readInternal(stock, false);
    }

    function config(address stock) external view override returns (StockConfig memory) {
        return _configs[stock];
    }

    function lastGoodPrice(address stock) external view override returns (uint256 s, uint256 at) {
        return (_lastGoodPrices[stock], _lastGoodTimestamps[stock]);
    }

    /// @notice Records the current feed price as last-good when the reading is fresh.
    function poke(address stock) external override returns (PriceReading memory reading) {
        reading = _readInternal(stock, false);
        if (reading.fresh && reading.s > 0) {
            _lastGoodPrices[stock] = reading.s;
            _lastGoodTimestamps[stock] = block.timestamp;
        }
    }

    /// @inheritdoc IPriceGuard
    function twapCheck(address stock) external view override returns (uint256 twap, bool ok) {
        PriceReading memory r = _readInternal(stock, false);
        twap = _twapPrice(stock);
        TwapConfig memory t = _twap[stock];
        if (!t.enabled || !r.fresh || twap == 0) return (twap, false);
        ok = _withinBand(r.s, twap, t.bandBps);
    }

    /// @notice The configured TWAP reference price in WAD USD per whole stock, or 0 when unavailable.
    function twapPrice(address stock) external view returns (uint256) {
        return _twapPrice(stock);
    }

    /// @notice True when the guard is globally paused.
    function globalPaused() external view returns (bool) {
        return _globalPaused;
    }

    /// @notice The TWAP configuration for `stock`.
    function twapConfig(address stock) external view returns (TwapConfig memory) {
        return _twap[stock];
    }

    /// @notice Current US-Eastern market session derived from `block.timestamp`.
    function getMarketSession() public view returns (SessionKind) {
        return sessionAt(block.timestamp);
    }

    /// @notice Session for an arbitrary timestamp, with real US DST rules. Exposed for ops tooling and tests.
    function sessionAt(uint256 timestamp) public pure returns (SessionKind) {
        uint256 offset = _etOffset(timestamp);
        // Guard timestamps smaller than the ET offset (only reachable in tests / pre-1970 values).
        uint256 local = timestamp >= offset ? timestamp - offset : 0;
        uint256 dow = ((local / SECONDS_PER_DAY) + 4) % 7; // 0 = Sunday
        if (dow == 0 || dow == 6) return SessionKind.CLOSED;

        uint256 t = local % SECONDS_PER_DAY;
        if (t >= 34_200 && t < 57_600) return SessionKind.REGULAR; // 09:30 – 16:00 ET
        if ((t >= 14_400 && t < 34_200) || (t >= 57_600 && t <= 72_000)) {
            return SessionKind.EXTENDED; // 04:00 – 09:30 and 16:00 – 20:00 ET
        }
        return SessionKind.CLOSED;
    }

    // ---------------------------------------------------------------------------------------------- internals

    function _readInternal(address stock, bool withTwap) internal view returns (PriceReading memory reading) {
        StockConfig memory cfg = _configs[stock];
        if (!cfg.enabled) revert StockUnknown(stock);

        SessionKind session = _globalPaused ? SessionKind.HALTED : sessionAt(block.timestamp);
        (uint256 price, uint256 feedUpdatedAt, bool feedOk) = _feedPrice(cfg);
        uint32 maxAge = _maxAge(cfg, session);

        bool fresh = feedOk && price > 0 && feedUpdatedAt != 0 && feedUpdatedAt <= block.timestamp
            && block.timestamp - feedUpdatedAt <= maxAge;

        bool paused = _globalPaused || _buysPaused[stock] || session == SessionKind.HALTED || !fresh;

        if (withTwap && paused == false) {
            TwapConfig memory t = _twap[stock];
            if (t.enabled && (session == SessionKind.REGULAR || session == SessionKind.EXTENDED)) {
                uint256 twap = _twapPrice(stock);
                // Unreadable TWAP is treated as unsafe: pause buys rather than trade against an unknown reference.
                if (twap == 0 || !_withinBand(price, twap, t.bandBps)) paused = true;
            }
        }

        uint256 valuation = fresh ? price : _lastGoodPrices[stock];

        reading = PriceReading({
            s: valuation,
            session: session,
            fresh: fresh,
            buysPaused: paused,
            updatedAt: feedUpdatedAt
        });
    }

    function _maxAge(StockConfig memory cfg, SessionKind session) internal pure returns (uint32) {
        if (session == SessionKind.REGULAR) {
            return cfg.maxAgeRegular == 0 ? DEFAULT_MAX_AGE_REGULAR : cfg.maxAgeRegular;
        }
        if (session == SessionKind.EXTENDED || session == SessionKind.HALTED) {
            return cfg.maxAgeExtended == 0 ? DEFAULT_MAX_AGE_EXTENDED : cfg.maxAgeExtended;
        }
        return MAX_AGE_CLOSED;
    }

    /// @dev Reads an AggregatorV3 feed. Never reverts on a broken feed: reports `ok == false` instead.
    function _feedPrice(StockConfig memory cfg) internal view returns (uint256 priceWad, uint256 updatedAt, bool ok) {
        address feed = cfg.feed;
        if (feed == address(0) || feed.code.length == 0) return (0, 0, false);

        uint80 roundId;
        int256 answer;
        uint80 answeredInRound;
        try IPriceFeedV3(feed).latestRoundData() returns (
            uint80 roundId_, int256 answer_, uint256, uint256 updatedAt_, uint80 answeredInRound_
        ) {
            roundId = roundId_;
            answer = answer_;
            updatedAt = updatedAt_;
            answeredInRound = answeredInRound_;
        } catch {
            return (0, 0, false);
        }

        if (answer <= 0 || updatedAt == 0) return (0, updatedAt, false);
        if (roundId != 0 && answeredInRound < roundId) return (0, updatedAt, false);

        uint8 dec;
        try IPriceFeedV3(feed).decimals() returns (uint8 d) {
            dec = d;
        } catch {
            return (0, updatedAt, false);
        }
        if (dec > 18) return (0, updatedAt, false);

        priceWad = dec == 18 ? uint256(answer) : uint256(answer) * (10 ** (18 - dec));
        ok = true;
    }

    function _twapPrice(address stock) internal view returns (uint256) {
        TwapConfig memory t = _twap[stock];
        if (!t.enabled) return 0;
        try t.ref.referencePrice(stock, t.fee) returns (uint256 p) {
            return p;
        } catch {
            return 0;
        }
    }

    function _withinBand(uint256 price, uint256 twap, uint16 bandBps) internal pure returns (bool) {
        if (twap == 0) return false;
        uint256 diff = price > twap ? price - twap : twap - price;
        return diff * BPS <= twap * uint256(bandBps);
    }

    // ---------------------------------------------------------------------------------------------- US DST / calendar

    function _etOffset(uint256 timestamp) internal pure returns (uint256) {
        return _isDst(timestamp) ? ET_DST_OFFSET : ET_STD_OFFSET;
    }

    /// @dev US DST: starts second Sunday of March 02:00 local (07:00 UTC), ends first Sunday of November 02:00 local
    /// (06:00 UTC). Correct for all years after 2007.
    function _isDst(uint256 timestamp) internal pure returns (bool) {
        (int256 y,,) = _civilFromDays(int256(timestamp / SECONDS_PER_DAY));
        uint256 year = uint256(y);
        uint256 start = _nthSunday(year, 3, 2, 7);
        uint256 end = _nthSunday(year, 11, 1, 6);
        return timestamp >= start && timestamp < end;
    }

    function _nthSunday(uint256 year, uint256 month, uint256 n, uint256 hourUtc) internal pure returns (uint256) {
        int256 firstDay = _daysFromCivil(int256(year), month, 1);
        uint256 dow = (uint256(firstDay + 4) % 7);
        uint256 offset = (7 - dow) % 7;
        uint256 dayNum = 1 + offset + 7 * (n - 1);
        int256 dayIndex = _daysFromCivil(int256(year), month, dayNum);
        return uint256(dayIndex) * SECONDS_PER_DAY + hourUtc * 3600;
    }

    /// @dev Howard Hinnant's civil-from-days algorithm.
    function _civilFromDays(int256 z) internal pure returns (int256 y, uint256 m, uint256 d) {
        z += 71_9468;
        int256 era = (z >= 0 ? z : z - 146_096) / 146_097;
        uint256 doe = uint256(z - era * 146_097);
        uint256 yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
        y = int256(yoe) + era * 400;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        d = doy - (153 * mp + 2) / 5 + 1;
        m = mp < 10 ? mp + 3 : mp - 9;
        if (m <= 2) y += 1;
    }

    /// @dev Howard Hinnant's days-from-civil algorithm.
    function _daysFromCivil(int256 y, uint256 m, uint256 d) internal pure returns (int256) {
        if (m <= 2) y -= 1;
        int256 era = (y >= 0 ? y : y - 399) / 400;
        uint256 yoe = uint256(y - era * 400);
        uint256 mp = m > 2 ? m - 3 : m + 9;
        uint256 doy = (153 * mp + 2) / 5 + d - 1;
        int256 doe = int256(yoe) * 365 + int256(yoe / 4) - int256(yoe / 100) + int256(doy);
        return era * 146_097 + doe - 71_9468;
    }
}