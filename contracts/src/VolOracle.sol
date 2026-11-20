// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IVolOracle} from "./interfaces/IVolOracle.sol";
import {VolReading} from "./libs/OptionTypes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title VolOracle
/// @notice Production implied-volatility oracle for Arcum. Replaces the engine's hardcoded `sigmaBps = 5000` with a
/// keeper-posted, bounded, expiring reading per stock.
/// @dev Design notes that matter operationally:
/// - The keeper (off-chain `vol-engine`) posts a COMPOSITE sigma per stock: base IV plus skew plus earnings/weekend
///   bumps, exactly as `VolReading.sigmaBps` is documented in `OptionTypes`. The contract never synthesises vol itself.
/// - Fail closed, not fail silent: a reading outside `[minSigmaBps, maxSigmaBps]`, expired, or for a disabled stock
///   reports `ok = false`. The engine then refuses new buys (`StaleVol`) while still valuing and accruing on the last
///   good sigma, so writers can always exit.
/// - Two-step ownership: production ownership must end at a Safe, and the Safe must `acceptOwnership()`.
/// - Publishers are separate keys from the owner: the keeper hot key can post, it cannot reconfigure bounds.
contract VolOracle is IVolOracle, Ownable2Step {
    uint256 private constant MAX_BATCH = 32;

    mapping(address => VolConfig) private _configs;
    mapping(address => VolReading) private _readings;
    mapping(address => bool) private _publishers;

    constructor() Ownable(msg.sender) {}

    // ---------------------------------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------------------------------

    function setVolConfig(address stock, VolConfig calldata cfg) external override onlyOwner {
        if (cfg.minSigmaBps == 0 || cfg.maxSigmaBps <= cfg.minSigmaBps) {
            revert SigmaOutOfBounds(cfg.minSigmaBps, cfg.minSigmaBps, cfg.maxSigmaBps);
        }
        if (cfg.minTtl == 0 || cfg.maxAge < cfg.minTtl) {
            revert TtlTooShort(cfg.minTtl, cfg.maxAge);
        }
        _configs[stock] = cfg;
        emit VolConfigSet(stock, cfg.minSigmaBps, cfg.maxSigmaBps, cfg.maxAge, cfg.minTtl, cfg.enabled);
    }

    function setPublisher(address account, bool allowed) external override onlyOwner {
        _publishers[account] = allowed;
        emit PublisherSet(account, allowed);
    }

    // ---------------------------------------------------------------------------------------------
    // Posting
    // ---------------------------------------------------------------------------------------------

    function post(address stock, VolReading calldata reading) external override {
        if (!_publishers[msg.sender]) revert NotPublisher(msg.sender);
        _post(stock, reading);
    }

    function postMany(address[] calldata stocks, VolReading[] calldata readings) external override {
        if (!_publishers[msg.sender]) revert NotPublisher(msg.sender);
        uint256 n = stocks.length;
        if (n != readings.length) revert SigmaOutOfBounds(uint64(n), uint64(n), uint64(readings.length));
        if (n > MAX_BATCH) revert SigmaOutOfBounds(uint64(n), 0, uint64(MAX_BATCH));
        for (uint256 i; i < n; ++i) {
            _post(stocks[i], readings[i]);
        }
    }

    function _post(address stock, VolReading calldata reading) internal {
        VolConfig memory cfg = _configs[stock];
        if (!cfg.enabled) revert StockNotConfigured(stock);

        if (reading.sigmaBps < cfg.minSigmaBps || reading.sigmaBps > cfg.maxSigmaBps) {
            revert SigmaOutOfBounds(reading.sigmaBps, cfg.minSigmaBps, cfg.maxSigmaBps);
        }
        if (reading.validUntil <= block.timestamp) revert ValidUntilInPast(reading.validUntil);

        uint256 minValidUntil = block.timestamp + cfg.minTtl;
        if (reading.validUntil < minValidUntil) revert TtlTooShort(reading.validUntil, minValidUntil);

        uint256 maxValidUntil = block.timestamp + cfg.maxAge;
        if (reading.validUntil > maxValidUntil) revert HorizonTooLong(reading.validUntil, maxValidUntil);

        // Reject malformed readings instead of silently pricing on them.
        if (reading.skewK > 10_000 || reading.eventBumpBps > 20_000) {
            revert SigmaOutOfBounds(reading.sigmaBps, cfg.minSigmaBps, cfg.maxSigmaBps);
        }
        if (reading.buyBlockFrom != 0 && reading.buyBlockTo < reading.buyBlockFrom) {
            revert TtlTooShort(reading.buyBlockTo, reading.buyBlockFrom);
        }

        _readings[stock] = reading;
        _readings[stock].stale = false;

        emit VolPosted(stock, reading.sigmaBps, reading.skewK, reading.eventBumpBps, reading.validUntil, msg.sender);
    }

    // ---------------------------------------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------------------------------------

    function vol(address stock) external view override returns (VolReading memory reading) {
        reading = _readings[stock];
        reading.stale = reading.validUntil < block.timestamp;
    }

    function sigmaFor(address stock) external view override returns (uint64 sigmaBps, bool ok) {
        VolConfig memory cfg = _configs[stock];
        VolReading memory r = _readings[stock];
        if (!cfg.enabled || r.sigmaBps == 0) return (0, false);

        sigmaBps = r.sigmaBps;
        ok = r.validUntil >= block.timestamp && r.sigmaBps >= cfg.minSigmaBps && r.sigmaBps <= cfg.maxSigmaBps;
    }

    function inEventWindow(address stock) external view override returns (bool) {
        VolReading memory r = _readings[stock];
        if (r.buyBlockFrom == 0) return false;
        return block.timestamp >= r.buyBlockFrom && block.timestamp <= r.buyBlockTo;
    }

    function config(address stock) external view override returns (VolConfig memory) {
        return _configs[stock];
    }

    function isPublisher(address account) external view override returns (bool) {
        return _publishers[account];
    }
}