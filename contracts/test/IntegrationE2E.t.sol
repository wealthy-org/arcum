// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ArcumEngine} from "../src/ArcumEngine.sol";
import {SeriesRegistry} from "../src/SeriesRegistry.sol";
import {PriceGuard} from "../src/PriceGuard.sol";
import {AgentRouter} from "../src/AgentRouter.sol";
import {OptionToken} from "../src/OptionToken.sol";
import {Series} from "../src/libs/OptionTypes.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDG is ERC20 {
    constructor() ERC20("USDG", "USDG") {
        _mint(msg.sender, 10_000_000 * 1e6); // 10M USDG (6 decimals)
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title IntegrationE2ETest
/// @notice Comprehensive End-to-End Multi-Contract Lifecycle Test:
/// Deposit -> Buy Option -> Time Advance (Accrual) -> Sell Option -> Shield -> Agent Delegation
contract IntegrationE2ETest is Test {
    MockUSDG usdg;
    SeriesRegistry registry;
    PriceGuard priceGuard;
    ArcumEngine engine;
    AgentRouter agentRouter;

    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;

    address pool = address(0x2222);
    address trader = address(0x3333);
    address agent = address(0x4444);

    bytes32 nvdaCallId;
    bytes32 nvdaPutId;

    function setUp() public {
        usdg = new MockUSDG();
        priceGuard = new PriceGuard();
        registry = new SeriesRegistry();

        engine = new ArcumEngine(address(registry), address(priceGuard), address(usdg), pool);
        agentRouter = new AgentRouter(address(engine));

        registry.setEngine(address(engine));
        registry.setAllowedStock(NVDA, true);
        registry.setAllowedStock(TSLA, true);

        // Spot Prices
        priceGuard.setMockPrice(NVDA, 145 * 1e18); // $145 WAD
        priceGuard.setMockPrice(TSLA, 240 * 1e18); // $240 WAD

        // List Series: NVDA Up (Call) Strike $145, Daily
        nvdaCallId = registry.listSeries(NVDA, true, 145 * 1e18, 86400);
        // List Series: NVDA Down (Put) Strike $145, Weekly
        nvdaPutId = registry.listSeries(NVDA, false, 145 * 1e18, 604800);

        // Warp to active NYSE Session (Thursday 11:00 AM ET)
        vm.warp(4 * 86400 + 54000);

        // Fund accounts
        usdg.mint(trader, 50_000 * 1e6); // 50k USDG
        usdg.mint(pool, 500_000 * 1e6);  // 500k USDG
    }

    /// @notice Test 1: Complete Buy -> Accrue -> Sell Lifecycle
    function testE2E_BuyAccrueSellLifecycle() public {
        uint128 units = 10 * 1e18; // 10 tokens
        uint64 deadline = uint64(block.timestamp + 3600);

        // 1. Trader Buys Call Option
        vm.startPrank(trader);
        usdg.approve(address(engine), type(uint256).max);

        (uint256 costUsdg, uint256 tokensMinted) = engine.buy(
            nvdaCallId,
            units,
            2000 * 1e6,
            deadline,
            trader
        );
        vm.stopPrank();

        assertTrue(costUsdg > 0, "Buy cost must be positive");
        assertEq(tokensMinted, units, "Must mint exact units");

        Series memory s = registry.seriesOf(nvdaCallId);
        OptionToken token = OptionToken(s.token);
        assertEq(token.balanceOf(trader), units, "Trader received OptionToken");

        // 2. Advance time 24 hours to simulate funding accrual
        uint128 normBefore = registry.seriesOf(nvdaCallId).norm;
        vm.warp(block.timestamp + 86400);

        // Keeper triggers accrual
        engine.accrue(nvdaCallId);
        uint128 normAfter = registry.seriesOf(nvdaCallId).norm;
        assertTrue(normAfter < normBefore, "Norm must monotonically decrease over time");

        // 3. Trader sells remaining position
        vm.startPrank(trader);
        token.approve(address(engine), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(pool);
        usdg.approve(address(engine), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(trader);
        uint256 balanceBeforeSell = usdg.balanceOf(trader);
        uint256 proceedsUsdg = engine.sell(nvdaCallId, units, 1, type(uint64).max, trader);
        vm.stopPrank();

        assertTrue(proceedsUsdg > 0, "Proceeds must be positive");
        assertEq(token.balanceOf(trader), 0, "All option tokens sold");
        assertEq(usdg.balanceOf(trader), balanceBeforeSell + proceedsUsdg, "Proceeds credited to trader");
    }

    /// @notice Test 2: AI Agent Router Delegation Lifecycle
    function testE2E_AgentRouterDelegation() public {
        uint128 budget = 1000 * 1e6; // 1000 USDG
        uint128 maxPerTrade = 500 * 1e6; // 500 USDG
        uint64 expiry = uint64(block.timestamp + 7 days);

        // Trader configures policy and approves USDG to AgentRouter
        address[] memory allowed = new address[](2);
        allowed[0] = NVDA;
        allowed[1] = TSLA;

        vm.startPrank(trader);
        agentRouter.setPolicy(agent, budget, maxPerTrade, expiry, true, true, allowed);
        usdg.approve(address(agentRouter), type(uint256).max);
        vm.stopPrank();

        // Agent executes trade within policy limits
        uint128 tradeUnits = 2 * 1e18;
        uint64 deadline = uint64(block.timestamp + 3600);

        vm.prank(agent);
        (uint256 agentCost, uint256 agentTokens) = agentRouter.buyFor(
            trader,
            nvdaCallId,
            tradeUnits,
            maxPerTrade,
            deadline
        );

        assertTrue(agentCost > 0, "Agent trade cost must be > 0");
        assertTrue(agentCost <= maxPerTrade, "Trade must respect maxPerTrade");
        assertEq(agentTokens, tradeUnits, "Must mint exact delegated units");

        Series memory s = registry.seriesOf(nvdaCallId);
        assertEq(OptionToken(s.token).balanceOf(trader), tradeUnits, "Tokens delivered to trader");
    }

    /// @notice Test 3: Downside Protection Shield Flow
    function testE2E_ShieldProtectionFlow() public {
        uint128 shieldUnits = 5 * 1e18; // Protect 5 NVDA stocks
        uint64 deadline = uint64(block.timestamp + 3600);

        // Trader buys Weekly Put for protection
        vm.startPrank(trader);
        usdg.approve(address(engine), type(uint256).max);

        (uint256 shieldCost, uint256 shieldTokens) = engine.buy(
            nvdaPutId,
            shieldUnits,
            1500 * 1e6,
            deadline,
            trader
        );
        vm.stopPrank();

        assertTrue(shieldCost > 0, "Shield cost > 0");
        assertEq(shieldTokens, shieldUnits, "Shield tokens received");

        // Verify Put Option Token held in trader wallet
        Series memory s = registry.seriesOf(nvdaPutId);
        assertEq(OptionToken(s.token).balanceOf(trader), shieldUnits, "Protection active");
    }
}
