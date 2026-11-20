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

contract FakeFeed is IPriceFeedV3 {    uint8 private immutable _dec;
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
        // The refusal tests below use an EOA owner on purpose; production runs must leave this unset.
        vm.setEnv("ALLOW_EOA_OWNER", "true");
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





    /// @notice The leaked staging deployer key must never sign a production deploy.
    /// @dev Exercised through `_guardAccounts` because the private key of that address is (by design) not available here.
    function test_guard_refusesCompromisedStagingDeployer() public {
        DeployProductionHarness h = new DeployProductionHarness();
        vm.expectRevert(bytes("deployer is the compromised staging key (exposed 2026-11-17): generate a fresh key first"));
        h.guard(0x1B4Faa130Aa607Fce29F9AAd6120b4492DE93e45, OWNER, true);
    }

    /// @notice Deployer must not keep ownership of the production system.
    function test_guard_refusesOwnerEqualToDeployer() public {
        DeployProductionHarness h = new DeployProductionHarness();
        address deployer = vm.addr(ANVIL_PK);
        vm.expectRevert(
            bytes("OWNER_ADDRESS must not be the deployer: hand production ownership to a Safe/multisig")
        );
        h.guard(deployer, deployer, false);
    }

    /// @notice A plain EOA owner is refused unless explicitly accepted.
    function test_guard_refusesEoaOwnerWithoutOverride() public {
        DeployProductionHarness h = new DeployProductionHarness();
        vm.expectRevert(
            bytes("OWNER_ADDRESS has no code: expected a Safe/multisig (set ALLOW_EOA_OWNER=true to accept an EOA")
        );
        h.guard(vm.addr(ANVIL_PK), OWNER, false);
    }

    /// @notice A contract owner (Safe/multisig) passes, and a distinct EOA deployer is never confused for the leaked key.
    function test_guard_acceptsContractOwner() public {
        DeployProductionHarness h = new DeployProductionHarness();
        h.guard(vm.addr(ANVIL_PK), address(usdg), false); // usdg stands in for a Safe: it has code
    }


    /// @notice Placeholder or codeless addresses must be refused, tested on the helper to stay order-independent
    /// (`vm.setEnv` values are cached per suite, so run()-level overrides are not deterministic).
    function test_requireCode_refusesZeroAddress() public {
        DeployProductionHarness h = new DeployProductionHarness();
        vm.expectRevert(bytes("USDG_ADDRESS required"));
        h.requireCode(address(0), "USDG_ADDRESS");
    }

    function test_requireCode_refusesCodelessAddress() public {
        DeployProductionHarness h = new DeployProductionHarness();
        vm.expectRevert(bytes("USDG_ADDRESS has no code on this chain"));
        h.requireCode(address(0xD15EA5E), "USDG_ADDRESS");
    }

    function test_requireCode_acceptsDeployedContract() public {
        DeployProductionHarness h = new DeployProductionHarness();
        h.requireCode(address(usdg), "USDG_ADDRESS");
    }

    /// @notice A silent or zero-priced feed must be refused before anything is deployed.
    function test_requireAnsweringFeed_refusesZeroAnswer() public {
        DeployProductionHarness h = new DeployProductionHarness();
        FakeFeed silent = new FakeFeed(8, 0);
        vm.expectRevert(bytes("FEED_NVDA not answering"));
        h.requireAnsweringFeed(address(silent), "FEED_NVDA");
    }

    function test_requireAnsweringFeed_refusesIncompleteRound() public {
        DeployProductionHarness h = new DeployProductionHarness();
        feed.setRounds(10, 9); // answeredInRound < roundId
        vm.expectRevert(bytes("FEED_NVDA incomplete round"));
        h.requireAnsweringFeed(address(feed), "FEED_NVDA");
    }

    function test_requireAnsweringFeed_acceptsHealthyFeed() public {
        DeployProductionHarness h = new DeployProductionHarness();
        (uint80 roundId, int256 answer,, uint256 updatedAt,) = h.requireAnsweringFeed(address(feed), "FEED_NVDA");
        assertEq(roundId, 1);
        assertEq(answer, 14_250_000_000);
        assertGt(updatedAt, 0);
    }

    // ------------------------------------------------------------------ staleness window guard

    /// @notice The shipped 90000s (25h) regular window is refused: it would treat an intraday-stale answer as live.
    function test_requireSaneMaxAge_refusesTwentyFiveHourRegularWindow() public {
        DeployProductionHarness h = new DeployProductionHarness();
        vm.expectRevert("MAX_AGE_REGULAR too loose: >1h during a live session");
        h.requireSaneMaxAge(90_000, 900);
    }

    function test_requireSaneMaxAge_refusesTwentyFiveHourExtendedWindow() public {
        DeployProductionHarness h = new DeployProductionHarness();
        vm.expectRevert("MAX_AGE_EXTENDED too loose: >1h during a live session");
        h.requireSaneMaxAge(300, 90_000);
    }

    /// @dev A zero window would pause every buy the moment a feed goes quiet; refuse it rather than deploy it.
    function test_requireSaneMaxAge_refusesZeroWindow() public {
        DeployProductionHarness h = new DeployProductionHarness();
        vm.expectRevert("MAX_AGE_REGULAR too loose: >1h during a live session");
        h.requireSaneMaxAge(0, 900);
    }

    function test_requireSaneMaxAge_acceptsShippedDefaults() public {
        DeployProductionHarness h = new DeployProductionHarness();
        h.requireSaneMaxAge(300, 900);
        h.requireSaneMaxAge(3600, 3600); // boundary is inclusive
    }

    function _stripSelector(bytes memory data) internal pure returns (bytes memory out) {
        if (data.length < 4) return data;
        out = new bytes(data.length - 4);
        for (uint256 i; i < out.length; ++i) {
            out[i] = data[i + 4];
        }
    }
}
/// @notice Exposes the deploy script's internal guard so its refusal paths can be unit-tested directly.
contract DeployProductionHarness is DeployProduction {
    function guard(address deployer, address owner, bool allowEoaOwner) external view {
        _guardAccounts(deployer, owner, allowEoaOwner);
    }

    function requireCode(address addr, string memory label) external view {
        _requireCode(addr, label);
    }

    function requireAnsweringFeed(address feed, string memory label)
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return _requireAnsweringFeed(feed, label);
    }

    function requireSaneMaxAge(uint32 maxAgeRegular, uint32 maxAgeExtended) external pure {
        _requireSaneMaxAge(maxAgeRegular, maxAgeExtended);
    }
}
