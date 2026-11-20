// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title AggregatorV3Interface
/// @notice Canonical Chainlink AggregatorV3 read surface, as documented by Chainlink and as used by the Robinhood
/// Chain equity feeds. Kept deliberately minimal: the protocol only ever reads a feed, never writes to one.
/// @dev Robinhood Chain stock-token feeds return the price with the corporate-action multiplier already applied, so
/// consumers MUST NOT multiply by a UI multiplier a second time. `PriceGuardProd` encodes that as
/// `StockConfig.multiplierEmbedded = true`.
///
/// Feed addresses are NOT to be guessed or copied from an old manifest. Resolve them from the official Robinhood
/// Chain oracle docs, then confirm on-chain that `description()` matches the expected pair (e.g. "NVDA / USD") and
/// record `decimals()`. `test/fork/Mainnet4663.t.sol` does exactly that against the live mainnet feeds.
interface AggregatorV3Interface {
    /// @notice Number of decimals the feed answers in. Robinhood Chain equity feeds answer in 8.
    function decimals() external view returns (uint8);

    /// @notice Human-readable pair name, e.g. "RHNVDA / USD" or "Robinhood AAPL / USD".
    function description() external view returns (string memory);

    /// @notice The feed's aggregator version.
    function version() external view returns (uint256);

    /// @notice Latest round data.
    /// @return roundId The round this answer belongs to.
    /// @return answer Price in `decimals()`, already including the corporate-action multiplier.
    /// @return startedAt Round start timestamp.
    /// @return updatedAt Timestamp the answer was last written. Consumers MUST reject stale values against this.
    /// @return answeredInRound The round the answer was computed in. When this lags `roundId`, the round is
    /// incomplete and the answer must be treated as invalid.
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);

    /// @notice Data for a specific historical round.
    function getRoundData(uint80 _roundId)
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
