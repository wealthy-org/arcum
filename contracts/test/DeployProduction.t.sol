// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {DeployProduction} from "../script/DeployProduction.s.sol";
import {IPriceFeedV3} from "../src/PriceGuardProd.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FakeUSDG is ERC20 {
    uint8 private immutable _dec;

    constructor(uint8 dec) ERC20("Fake USDG", "USDG") {
        _dec = dec;
    }

    function decimals() public view override returns (uint8) {
        return _dec;
    }
}

contract FakeStock is ERC20 {
    constructor() ERC20("Fake NVDA", "NVDA") {}
}

contract FakeFeed is IPriceFeedV3 {
    uint8 private immutable _dec;
    int256 public answer;
    uint256 public updatedAt;
    uint80 public roundId = 1;
    uint80 public answeredInRound = 1;

    constructor(uint8 dec, int256 answer_) {
        _dec = dec;
        answer = answer_;
        updatedAt = block.timestamp;
    }

    function decimals() external view override returns (uint8) {
        return _dec;
    }

    function setRounds(uint80 roundId_, uint80 answeredInRound_) external {
        roundId = roundId_;
        answeredInRound = answeredInRound_;
    }

    function setAnswer(int256 answer_) external {
        answer = answer_;
    }

    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (roundId, answer, updatedAt, updatedAt, answeredInRound);
    }
}

/// @notice Guard rails of the production deploy script: it must refuse placeholder inputs instead of silently
/// deploying a mock stack. Asserted in a single test because `vm.setEnv` state leaks between tests in one suite run.
/// The positive end-to-end path is proven against a real node by `script/verify-production-deploy.sh`.
contract DeployProductionScriptTest is Test {
    uint256 internal constant ANVIL_PK = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    address internal constant OWNER = address(0xBEEF);

    FakeUSDG internal usdg;
    FakeStock internal stock;
    FakeFeed internal feed;

    function setUp() public {
        usdg = new FakeUSDG(6);
        stock = new FakeStock();
        feed = new FakeFeed(8, 14_250_000_000); // $142.50
    }

    function _baseEnv() internal {
        vm.setEnv("PRIVATE_KEY", vm.toString(ANVIL_PK));
        vm.setEnv("USDG_ADDRESS", vm.toString(address(usdg)));
        vm.setEnv("OWNER_ADDRESS", vm.toString(OWNER));
        vm.setEnv("STOCK_SYMBOLS", "NVDA");
        vm.setEnv("STOCK_NVDA", vm.toString(address(stock)));
        vm.setEnv("FEED_NVDA", vm.toString(address(feed)));
        vm.setEnv("SERIES_SPECS", "NVDA:call:140:86400");
        vm.setEnv("DRY_RUN", "false");
        vm.setEnv("WRITE_MANIFEST", "false");
        vm.setEnv("RENOUNCE_DEPLOYER", "false");
    }

    /// @dev The next `run()` must revert.
    function _runExpectingRevert() internal returns (bytes memory) {
        DeployProduction script = new DeployProduction();
        try script.run() {
            fail();
        } catch (bytes memory reason) {
            return reason;
        }
        return "";
    }

    /// @notice A settlement token address with no code must abort the run.
    /// @dev Feed-value validation (zero answer, incomplete round, staleness) is covered by
    /// `PriceGuardProd.t.sol`, which tests the guard directly instead of through global env vars.
    function test_run_refusesCodelessUsdg() public {
        _baseEnv();
        vm.setEnv("USDG_ADDRESS", vm.toString(address(0xD15EA5E)));
        assertGt(_runExpectingRevert().length, 0, "codeless USDG rejected");
    }

    /// @notice A feed address with no code must abort the run.
    function test_run_refusesCodelessFeed() public {
        _baseEnv();
        vm.setEnv("FEED_NVDA", vm.toString(address(0xFEED)));
        assertGt(_runExpectingRevert().length, 0, "codeless feed rejected");
    }

    /// @notice A stock address with no code must abort the run.
    function test_run_refusesCodelessStock() public {
        _baseEnv();
        vm.setEnv("STOCK_NVDA", vm.toString(address(0xF00D)));
        assertGt(_runExpectingRevert().length, 0, "codeless stock rejected");
    }

    /// @notice A missing owner must abort the run.
    /// @dev The positive path (valid config -> full deploy, guard reads the feed, ownership handed over) runs against a
    /// real node in `script/verify-production-deploy.sh`; it cannot live here because `vm.setEnv` values are cached per
    /// key for the whole suite, so a refusal-test override would leak into the positive test.
    function test_run_refusesZeroOwner() public {
        _baseEnv();
        vm.setEnv("OWNER_ADDRESS", vm.toString(address(0)));
        assertGt(_runExpectingRevert().length, 0, "missing owner rejected");
    }

    function _stripSelector(bytes memory data) internal pure returns (bytes memory out) {
        if (data.length < 4) return data;
        out = new bytes(data.length - 4);
        for (uint256 i; i < out.length; ++i) {
            out[i] = data[i + 4];
        }
    }
}