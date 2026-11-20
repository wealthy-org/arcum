// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";

/// @title MockAggregator
/// @notice Test double for a Chainlink AggregatorV3 feed. Mutable so a test can drive the same failure modes the
/// production guard must survive: stale `updatedAt`, an incomplete round, a zero or negative answer, and a feed that
/// reverts outright.
/// @dev Not a production contract. It exists so `PriceGuardChainlink.t.sol` can exercise the real
/// `PriceGuardProd` read path without a fork, while `test/fork/Mainnet4663.t.sol` exercises the live feeds.
contract MockAggregator is AggregatorV3Interface {
    uint8 private immutable _decimals;
    string private _description;

    uint80 public roundId;
    int256 public answer;
    uint256 public startedAt;
    uint256 public updatedAt;
    uint80 public answeredInRound;

    /// @dev When true, `latestRoundData` / `getRoundData` revert, mimicking a feed whose aggregator is broken.
    bool public reverts;

    constructor(uint8 decimals_, string memory description_, int256 answer_, uint256 updatedAt_) {
        _decimals = decimals_;
        _description = description_;
        answer = answer_;
        startedAt = updatedAt_;
        updatedAt = updatedAt_;
        roundId = 1;
        answeredInRound = 1;
    }

    // ---------------------------------------------------------------------------------------------- Chainlink surface

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    function version() external pure override returns (uint256) {
        return 4;
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        require(!reverts, "MockAggregator: reverted");
        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }

    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        require(!reverts, "MockAggregator: reverted");
        return (_roundId, answer, startedAt, updatedAt, answeredInRound);
    }

    // ---------------------------------------------------------------------------------------------- test controls

    /// @notice Publish a fresh round: bumps `roundId`, sets the answer, and stamps `updatedAt`.
    function setAnswer(int256 answer_, uint256 updatedAt_) external {
        roundId += 1;
        answeredInRound = roundId;
        answer = answer_;
        startedAt = updatedAt_;
        updatedAt = updatedAt_;
    }

    /// @notice Publish an answer but leave `answeredInRound` behind `roundId`, i.e. an incomplete round.
    function setIncompleteRound(int256 answer_, uint256 updatedAt_) external {
        roundId += 1;
        answeredInRound = roundId - 1;
        answer = answer_;
        startedAt = updatedAt_;
        updatedAt = updatedAt_;
    }

    function setReverts(bool v) external {
        reverts = v;
    }
}
