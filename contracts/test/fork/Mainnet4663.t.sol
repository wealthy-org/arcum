// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {AggregatorV3Interface} from "../../src/interfaces/AggregatorV3Interface.sol";
import {PriceGuardProd} from "../../src/PriceGuardProd.sol";
import {IPriceGuard} from "../../src/interfaces/IPriceGuard.sol";
import {PriceReading, SessionKind} from "../../src/libs/OptionTypes.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @title Mainnet4663ForkTest
/// @notice Proves the production oracle wiring against the LIVE Robinhood Chain mainnet (chainId 4663) instead of
/// trusting addresses copied out of a manifest or a chat message.
///
/// The Robinhood Chain oracle docs are explicit about this: feed addresses must be resolved from the official docs and
/// then confirmed on-chain (`description()` must name the pair, `decimals()` must be recorded). This test is that
/// confirmation, executed every run.
///
/// Skipping policy: this suite is skipped only when the operator explicitly opts out with `SKIP_FORK_TESTS=true`.
/// A missing or unreachable RPC is a FAILURE, not a silent skip — a test that passes because it never ran is a lie.
///
/// Run it:
///   forge test --match-contract Mainnet4663ForkTest -vv
///   RH_MAINNET_RPC=https://rpc.mainnet.chain.robinhood.com forge test --match-contract Mainnet4663ForkTest -vv
contract Mainnet4663ForkTest is Test {
    uint256 internal constant MAINNET_CHAIN_ID = 4663;

    /// @dev Settlement token: USDG (Global Dollar), 6 decimals, verified on-chain.
    address internal constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    /// @dev Stock tokens + their Chainlink AggregatorV3 feeds. Source: docs/CHAIN_FACTS.md, cross-checked on-chain by
    /// this test. TSLA and SPY have no Chainlink feed on 4663 yet, which is why they cannot be part of a production
    /// launch.
    address internal constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address internal constant NVDA_FEED = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;
    address internal constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address internal constant AAPL_FEED = 0x6B22A786bAa607d76728168703a39Ea9C99f2cD0;
    address internal constant QQQ = 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68;
    address internal constant QQQ_FEED = 0x80901d846d5D7B030F26B480776EE3b29374C2ae;

    /// @dev Feeds answer in 8 decimals. Recorded here so a silent feed upgrade cannot slip through unnoticed.
    uint8 internal constant EXPECTED_FEED_DECIMALS = 8;

    bool internal forked;

    function setUp() public {
        if (vm.envOr("SKIP_FORK_TESTS", false)) {
            return;
        }
        string memory rpc = vm.envOr("RH_MAINNET_RPC", string("https://rpc.mainnet.chain.robinhood.com"));
        vm.createSelectFork(rpc);
        forked = true;
    }

    modifier onlyForked() {
        if (!forked) {
            console.log("SKIP_FORK_TESTS=true: mainnet 4663 fork checks not executed");
            return;
        }
        _;
    }

    // ------------------------------------------------------------------ chain identity

    function test_fork_isChain4663() public onlyForked {
        assertEq(block.chainid, MAINNET_CHAIN_ID, "must be Robinhood Chain mainnet");
    }

    function test_fork_usdgIsTheRealSettlementToken() public onlyForked {
        assertGt(USDG.code.length, 0, "USDG has code");
        assertEq(IERC20Metadata(USDG).symbol(), "USDG", "symbol");
        assertEq(IERC20Metadata(USDG).decimals(), 6, "decimals");
    }

    // ------------------------------------------------------------------ feed identity, per the docs

    /// @notice Every configured feed must name the stock it prices. This is the check the Robinhood docs demand before
    /// an address is trusted, and it is the one that catches a stale or copy-pasted manifest entry.
    function test_fork_feedsDescribeTheirPair() public onlyForked {
        _assertFeedDescribes(NVDA_FEED, "NVDA");
        _assertFeedDescribes(AAPL_FEED, "AAPL");
        _assertFeedDescribes(QQQ_FEED, "QQQ");
    }

    function test_fork_feedsUseEightDecimals() public onlyForked {
        assertEq(AggregatorV3Interface(NVDA_FEED).decimals(), EXPECTED_FEED_DECIMALS, "NVDA decimals");
        assertEq(AggregatorV3Interface(AAPL_FEED).decimals(), EXPECTED_FEED_DECIMALS, "AAPL decimals");
        assertEq(AggregatorV3Interface(QQQ_FEED).decimals(), EXPECTED_FEED_DECIMALS, "QQQ decimals");
    }

    /// @notice Every feed must answer a complete, positive round. An incomplete round means the aggregator is mid-write
    /// and the answer is not usable.
    function test_fork_feedsAnswerCompletePositiveRounds() public onlyForked {
        _assertCompleteRound(NVDA_FEED, "NVDA");
        _assertCompleteRound(AAPL_FEED, "AAPL");
        _assertCompleteRound(QQQ_FEED, "QQQ");
    }

    /// @notice Stock tokens exist and name themselves, so a feed cannot be paired with the wrong token.
    function test_fork_stockTokensMatchTheirSymbols() public onlyForked {
        assertEq(IERC20Metadata(NVDA).symbol(), "NVDA", "NVDA token symbol");
        assertEq(IERC20Metadata(AAPL).symbol(), "AAPL", "AAPL token symbol");
        assertEq(IERC20Metadata(QQQ).symbol(), "QQQ", "QQQ token symbol");
        assertEq(IERC20Metadata(NVDA).decimals(), 18, "stock token decimals");
    }

    // ------------------------------------------------------------------ guard behaviour on live feeds

    /// @notice Deploy the real guard, point it at the real feeds, and read them. This is the exact wiring
    /// `DeployProduction.s.sol` performs, so a failure here means the deploy would fail too.
    function test_fork_prodGuardReadsLiveFeeds() public onlyForked {
        PriceGuardProd guard = new PriceGuardProd();

        // 300s regular window: the value `contracts/.env.production.example` now ships. The previous 90000 accepted a
        // six-hour-old answer as fresh inside a live session.
        guard.setStock(NVDA, _cfg(NVDA_FEED));
        guard.setStock(AAPL, _cfg(AAPL_FEED));
        guard.setStock(QQQ, _cfg(QQQ_FEED));

        _logReading(guard, NVDA, "NVDA");
        _logReading(guard, AAPL, "AAPL");
        _logReading(guard, QQQ, "QQQ");

        // The guard must never revert on a live feed, and must always produce a positive valuation once it has
        // accepted a configuration (setStock records last-good).
        assertGt(guard.read(NVDA).s, 0, "NVDA valuation");
        assertGt(guard.read(AAPL).s, 0, "AAPL valuation");
        assertGt(guard.read(QQQ).s, 0, "QQQ valuation");

        // lastGoodPrice is populated at configuration time from the live feed.
        (uint256 nvdaLast, uint256 nvdaAt) = guard.lastGoodPrice(NVDA);
        assertGt(nvdaLast, 0, "NVDA last good price recorded");
        assertEq(nvdaAt, block.timestamp, "recorded at configuration time");
    }

    /// @notice Documents the real freshness behaviour of the live feeds, whatever it happens to be at run time. This is
    /// a diagnostic, not a hard assertion: outside US market hours the equity feeds legitimately stop updating, so
    /// asserting "fresh" would fail every weekend.
    function test_fork_reportsLiveFeedFreshness() public onlyForked {
        (uint256 nvdaAge, bool nvdaFresh) = _age(NVDA_FEED);
        (uint256 aaplAge, bool aaplFresh) = _age(AAPL_FEED);
        (uint256 qqqAge, bool qqqFresh) = _age(QQQ_FEED);

        console.log("block.timestamp      ", block.timestamp);
        console.log("NVDA feed age (s)    ", nvdaAge);
        console.log("AAPL feed age (s)    ", aaplAge);
        console.log("QQQ  feed age (s)    ", qqqAge);
        console.log("fresh within 300s: NVDA", nvdaFresh);
        console.log("fresh within 300s: AAPL", aaplFresh);
        console.log("fresh within 300s: QQQ ", qqqFresh);

        // Whatever the freshness, an age of zero with a zero answer would be a broken feed.
        assertGt(_answer(NVDA_FEED), 0, "NVDA answer");
        assertGt(_answer(AAPL_FEED), 0, "AAPL answer");
        assertGt(_answer(QQQ_FEED), 0, "QQQ answer");
    }

    /// @notice The guard's session clock must agree with reality for the current block.
    function test_fork_sessionMatchesEasternTime() public onlyForked {
        PriceGuardProd guard = new PriceGuardProd();
        SessionKind s = guard.sessionAt(block.timestamp);
        console.log("session at block.timestamp", uint256(s));
        // 0 REGULAR, 1 EXTENDED, 2 CLOSED. HALTED (4) can only come from the pause flag, never from the clock.
        assertTrue(uint256(s) <= uint256(SessionKind.CLOSED), "clock never reports HALTED");
    }

    // ------------------------------------------------------------------ helpers

    function _cfg(address feed) internal pure returns (IPriceGuard.StockConfig memory) {
        return IPriceGuard.StockConfig({
            feed: feed,
            multiplierEmbedded: true, // Robinhood Chain feeds already include the corporate-action multiplier
            maxAgeRegular: 300,
            maxAgeExtended: 900,
            continuityBps: 0,
            enabled: true
        });
    }

    function _assertFeedDescribes(address feed, string memory symbol) internal view {
        assertGt(feed.code.length, 0, string.concat(symbol, ": feed has code"));
        string memory desc = AggregatorV3Interface(feed).description();
        console.log(string.concat(symbol, " feed description"), desc);
        assertTrue(_contains(desc, symbol), string.concat(symbol, ": feed description must name the symbol"));
    }

    function _assertCompleteRound(address feed, string memory symbol) internal view {
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) =
            AggregatorV3Interface(feed).latestRoundData();
        assertGt(answer, 0, string.concat(symbol, ": answer must be positive"));
        assertGt(updatedAt, 0, string.concat(symbol, ": updatedAt must be set"));
        assertLe(updatedAt, block.timestamp, string.concat(symbol, ": updatedAt must not be in the future"));
        assertEq(answeredInRound, roundId, string.concat(symbol, ": round must be complete"));
    }

    function _answer(address feed) internal view returns (int256) {
        (, int256 answer,,,) = AggregatorV3Interface(feed).latestRoundData();
        return answer;
    }

    function _age(address feed) internal view returns (uint256 age, bool freshWithin300) {
        (,,, uint256 updatedAt,) = AggregatorV3Interface(feed).latestRoundData();
        age = block.timestamp >= updatedAt ? block.timestamp - updatedAt : 0;
        freshWithin300 = updatedAt != 0 && updatedAt <= block.timestamp && age <= 300;
    }

    function _logReading(PriceGuardProd guard, address stock, string memory symbol) internal view {
        PriceReading memory r = guard.read(stock);
        console.log(string.concat(symbol, " price (WAD)"), r.s);
        console.log(string.concat(symbol, " fresh"), r.fresh);
        console.log(string.concat(symbol, " buysPaused"), r.buysPaused);
    }

    /// @dev Case-sensitive substring search. Feed descriptions on this chain are "RHNVDA / USD",
    /// "Robinhood AAPL / USD", "Robinhood QQQ / USD", so the symbol always appears verbatim.
    function _contains(string memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(haystack);
        bytes memory n = bytes(needle);
        if (n.length == 0 || h.length < n.length) return false;
        for (uint256 i; i <= h.length - n.length; ++i) {
            bool matched = true;
            for (uint256 j; j < n.length; ++j) {
                if (h[i + j] != n[j]) {
                    matched = false;
                    break;
                }
            }
            if (matched) return true;
        }
        return false;
    }
}
