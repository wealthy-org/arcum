// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {AgentRouter} from "../src/AgentRouter.sol";
import {ArcumEngine} from "../src/ArcumEngine.sol";
import {SeriesRegistry} from "../src/SeriesRegistry.sol";
import {PriceGuard} from "../src/PriceGuard.sol";
import {OptionToken} from "../src/OptionToken.sol";
import {Series} from "../src/libs/OptionTypes.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {WriterPool} from "../src/WriterPool.sol";
import {IOptionEngine} from "../src/interfaces/IOptionEngine.sol";
import {IReserve} from "../src/interfaces/IReserve.sol";
import {IFeeRouter} from "../src/interfaces/IFeeRouter.sol";
import {IPriceReference} from "../src/interfaces/IPriceReference.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockUSDGAgent is ERC20 {
    constructor() ERC20("USDG", "USDG") {
        _mint(msg.sender, 10000000 * 1e6);
    }
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract AgentRouterTest is Test {
    AgentRouter router;
    ArcumEngine engine;
    SeriesRegistry registry;
    PriceGuard priceGuard;
    MockUSDGAgent usdg;

    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;

    address ownerUser = address(0x5555);
    address agentKey = address(0x6666);
    address pool = address(0x7777);

    bytes32 nvdaSeriesId;
    bytes32 tslaSeriesId;

    function setUp() public {
        usdg = new MockUSDGAgent();
        priceGuard = new PriceGuard();
        registry = new SeriesRegistry();

        WriterPool poolImpl = new WriterPool(1800);
        bytes memory initData = abi.encodeWithSelector(
            WriterPool.initialize.selector,
            address(this),
            usdg,
            IOptionEngine(address(0)),
            priceGuard
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(poolImpl), initData);
        WriterPool realPool = WriterPool(address(proxy));
        realPool.setPublicDeposits(true);
        pool = address(realPool);

        engine = new ArcumEngine(address(registry), address(priceGuard), address(usdg), pool);
        router = new AgentRouter(address(engine));

        realPool.setModules(IOptionEngine(address(engine)), IReserve(address(0)), IFeeRouter(address(0)), IPriceReference(address(0)));

        registry.setEngine(address(engine));
        registry.setAllowedStock(NVDA, true);
        registry.setAllowedStock(TSLA, true);

        // Prices: NVDA $145, TSLA $250
        priceGuard.setMockPrice(NVDA, 145 * 1e18);
        priceGuard.setMockPrice(TSLA, 250 * 1e18);

        // List series
        nvdaSeriesId = registry.listSeries(NVDA, true, 145 * 1e18, 86400);
        tslaSeriesId = registry.listSeries(TSLA, true, 250 * 1e18, 86400);

        // Warp to NYSE regular hours
        vm.warp(4 * 86400 + 54000);

        // Fund owner with USDG
        usdg.mint(ownerUser, 20000 * 1e6);

        // Set policy: Owner grants Agent budget = 1,000 USDG, max per trade = 500 USDG, allowed stocks = [NVDA]
        address[] memory allowed = new address[](1);
        allowed[0] = NVDA;

        vm.startPrank(ownerUser);
        usdg.approve(address(router), type(uint256).max);
        router.setPolicy(
            agentKey,
            1000 * 1e6, // budget: 1000 USDG
            500 * 1e6,  // max per trade: 500 USDG
            uint64(block.timestamp + 7 days), // expiry: 7 days
            true,       // canSell
            true,       // canShield
            allowed
        );
        vm.stopPrank();
    }

    function testAgentCanBuyWithinBudget() public {
        uint64 deadline = uint64(block.timestamp + 3600);

        vm.startPrank(agentKey);
        (uint256 cost, uint256 tokens) = router.buyFor(
            ownerUser,
            nvdaSeriesId,
            10 * 1e18, // 10 units
            200 * 1e6, // max cost
            deadline
        );
        vm.stopPrank();

        assertTrue(cost > 0, "Cost must be > 0");
        assertTrue(tokens > 0, "Tokens must be minted");

        // Verify tokens are minted to OWNER, NOT the agent!
        Series memory s = registry.seriesOf(nvdaSeriesId);
        assertEq(OptionToken(s.token).balanceOf(ownerUser), tokens);
        assertEq(OptionToken(s.token).balanceOf(agentKey), 0);

        // Remaining budget should decrease
        uint256 rem = router.remainingBudget(ownerUser, agentKey);
        assertEq(rem, 1000 * 1e6 - cost);
    }

    function testAgentCannotTradeUnallowedStock() public {
        uint64 deadline = uint64(block.timestamp + 3600);

        // Agent tries to trade TSLA (which is not in allowed stocks list)
        vm.startPrank(agentKey);
        vm.expectRevert();
        router.buyFor(ownerUser, tslaSeriesId, 10 * 1e18, 500 * 1e6, deadline);
        vm.stopPrank();
    }

    function testAgentCannotTradeExceedingMaxPerTrade() public {
        uint64 deadline = uint64(block.timestamp + 3600);

        // Max per trade is 500 USDG; buying 10,000 units requires thousands of USDG
        vm.startPrank(agentKey);
        vm.expectRevert();
        router.buyFor(ownerUser, nvdaSeriesId, 5000 * 1e18, 50000 * 1e6, deadline);
        vm.stopPrank();
    }

    function testOwnerCanRevokeAgentPolicy() public {
        uint64 deadline = uint64(block.timestamp + 3600);

        // Owner revokes
        vm.prank(ownerUser);
        router.revoke(agentKey);

        // Agent attempts to buy -> reverts PolicyIsRevoked
        vm.startPrank(agentKey);
        vm.expectRevert();
        router.buyFor(ownerUser, nvdaSeriesId, 10 * 1e18, 200 * 1e6, deadline);
        vm.stopPrank();
    }

    function testAgentCanSellForOwner() public {
        uint64 deadline = uint64(block.timestamp + 3600);

        // 1. Buy first
        vm.prank(agentKey);
        (, uint256 tokens) = router.buyFor(
            ownerUser,
            nvdaSeriesId,
            10 * 1e18,
            200 * 1e6,
            deadline
        );

        Series memory s = registry.seriesOf(nvdaSeriesId);
        assertEq(OptionToken(s.token).balanceOf(ownerUser), tokens);

        // 2. Fund pool so it can pay
        usdg.mint(pool, 100000 * 1e6);

        // 3. Agent sells for owner
        uint256 ownerUsdgBefore = usdg.balanceOf(ownerUser);
        uint256 agentUsdgBefore = usdg.balanceOf(agentKey);

        vm.prank(agentKey);
        uint256 proceeds = router.sellFor(
            ownerUser,
            nvdaSeriesId,
            uint128(tokens),
            1,
            deadline
        );

        assertTrue(proceeds > 0, "Proceeds must be positive");
        assertEq(OptionToken(s.token).balanceOf(ownerUser), 0, "All tokens burned");
        assertEq(usdg.balanceOf(ownerUser), ownerUsdgBefore + proceeds, "Proceeds go straight to owner");
        assertEq(usdg.balanceOf(agentKey), agentUsdgBefore, "Agent receives zero funds");
    }

    function test_shieldFor_matchesDirectShield() public {
        // List weekly put for NVDA
        bytes32 put140 = registry.listSeries(NVDA, false, 140 * 1e18, 604800);
        bytes32 expected = engine.pickShield(NVDA, 500);
        assertEq(expected, put140);

        uint64 deadline = uint64(block.timestamp + 3600);
        vm.prank(agentKey);
        (bytes32 id,) = router.shieldFor(ownerUser, NVDA, 1e18, 500, 100e6, deadline);
        assertEq(id, expected);
    }

    function test_shieldFor_fallsBackToLowestStrike_likeEngine() public {
        // List weekly puts for NVDA: strike 140 and strike 130
        registry.listSeries(NVDA, false, 140 * 1e18, 604800);
        bytes32 put130 = registry.listSeries(NVDA, false, 130 * 1e18, 604800);

        // pct very small (e.g. 1 bps = 0.01% below $145 -> target $144.985),
        // target strike is higher than 140, so it picks 140 as strike <= target.
        // But if target is below all strikes (e.g. 2000 bps = 20% below $145 -> target $116),
        // there are no strikes <= $116, so it falls back to lowest strike (put130 = $130).
        bytes32 expected = engine.pickShield(NVDA, 2500); // 25% below -> target $108.75 < $130
        assertEq(expected, put130, "Should fall back to lowest strike when none <= target");

        uint64 deadline = uint64(block.timestamp + 3600);
        vm.prank(agentKey);
        (bytes32 id,) = router.shieldFor(ownerUser, NVDA, 1e18, 2500, 100e6, deadline);
        assertEq(id, expected);
    }
}
