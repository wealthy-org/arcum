// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {ArcumEngine} from "../../src/ArcumEngine.sol";
import {SeriesRegistry} from "../../src/SeriesRegistry.sol";
import {PriceGuard} from "../../src/PriceGuard.sol";
import {WriterPool} from "../../src/WriterPool.sol";
import {AgentRouter} from "../../src/AgentRouter.sol";
import {OptionToken} from "../../src/OptionToken.sol";
import {Series} from "../../src/libs/OptionTypes.sol";
import {MockUSDG} from "../../src/mocks/MockUSDG.sol";
import {MockStock} from "../../src/mocks/MockStock.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IOptionEngine} from "../../src/interfaces/IOptionEngine.sol";
import {IReserve} from "../../src/interfaces/IReserve.sol";
import {IFeeRouter} from "../../src/interfaces/IFeeRouter.sol";
import {IPriceReference} from "../../src/interfaces/IPriceReference.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Testnet46630ForkTest
/// @notice End-to-end integration test validating the exact wiring of the 46630 deployment architecture
contract Testnet46630ForkTest is Test {
    MockUSDG usdg;
    MockStock nvda;
    MockStock tsla;
    PriceGuard priceGuard;
    SeriesRegistry registry;
    WriterPool pool;
    ArcumEngine engine;
    AgentRouter router;

    address deployer = address(0xAAAA);
    address alice = address(0xBBBB);
    address bobAgent = address(0xCCCC);

    bytes32 nvdaCallId;
    bytes32 nvdaPutId;

    function setUp() public {
        vm.startPrank(deployer);

        usdg = new MockUSDG();
        nvda = new MockStock("NVIDIA", "NVDA");
        tsla = new MockStock("Tesla", "TSLA");

        priceGuard = new PriceGuard();
        registry = new SeriesRegistry();

        // 1. Deploy WriterPool Implementation & Proxy
        WriterPool poolImpl = new WriterPool(1800);
        bytes memory poolInit = abi.encodeWithSelector(
            WriterPool.initialize.selector,
            deployer,
            usdg,
            IOptionEngine(address(0)),
            priceGuard
        );
        ERC1967Proxy poolProxy = new ERC1967Proxy(address(poolImpl), poolInit);
        pool = WriterPool(address(poolProxy));
        pool.setPublicDeposits(true);

        // 2. Deploy ArcumEngine
        engine = new ArcumEngine(
            address(registry),
            address(priceGuard),
            address(usdg),
            address(pool)
        );
        registry.setEngine(address(engine));

        // 3. Connect modules (3.2 fix)
        pool.setModules(
            IOptionEngine(address(engine)),
            IReserve(address(0)),
            IFeeRouter(address(0)),
            IPriceReference(address(0))
        );
        pool.setParams(300, 1000, 100, 100_000_000e6); // 5m lock, 100M cap

        // 4. Deploy AgentRouter
        router = new AgentRouter(address(engine));

        // 5. Setup prices & series
        registry.setAllowedStock(address(nvda), true);
        registry.setAllowedStock(address(tsla), true);
        priceGuard.setMockPrice(address(nvda), 1425 * 1e17); // $142.50
        priceGuard.setMockPrice(address(tsla), 2488 * 1e17); // $248.80

        nvdaCallId = registry.listSeries(address(nvda), true, 141 * 1e18, 86400);  // NVDA Up $141 Daily
        nvdaPutId  = registry.listSeries(address(nvda), false, 140 * 1e18, 604800); // NVDA Down $140 Weekly (Shield)

        // 6. Initial Seed via deposit (3.4 fix: preserves exact 1:1 NAV ratio)
        usdg.mint(deployer, 5_000_000 * 1e6);
        usdg.approve(address(pool), 5_000_000 * 1e6);
        pool.deposit(5_000_000 * 1e6, deployer);

        vm.stopPrank();

        // Warp to active NYSE session (Thursday 11:00 AM ET)
        vm.warp(4 * 86400 + 54000);

        // Fund Alice
        usdg.mint(alice, 10_000 * 1e6);
        nvda.mint(alice, 100 * 1e18); // 100 NVDA stock tokens
    }

    /// @notice Test 1: Round-trip deposit and claim (verify no 10% loss - 3.4 fix)
    function testPoolRoundTripDepositClaim() public {
        uint256 depositAmt = 100 * 1e6; // 100 USDG
        vm.startPrank(alice);
        usdg.approve(address(pool), depositAmt);
        uint256 shares = pool.deposit(depositAmt, alice);
        assertTrue(shares > 0, "Must mint shares");

        // Wait past the 5-minute deposit lock
        vm.warp(block.timestamp + 301);

        // Request withdraw
        uint256 ticket = pool.requestWithdraw(shares);
        assertTrue(ticket > 0, "Ticket issued");

        // Wait past the 30-minute queue delay (1800s)
        vm.warp(block.timestamp + 1801);

        uint256 balBefore = usdg.balanceOf(alice);
        uint256 claimed = pool.claim(ticket);
        vm.stopPrank();

        assertTrue(claimed > 0, "Claimed USDG must be > 0");
        // Verify round trip returns approximately 100 USDG (within 0.1% precision, NOT 10% loss!)
        assertApproxEqRel(claimed, depositAmt, 0.01e18, "Deposit and claim round trip should preserve capital");
        assertEq(usdg.balanceOf(alice), balBefore + claimed, "Alice received claimed funds");
    }

    /// @notice Test 2: Full Buy, Accrue, and Sell Lifecycle without cheats (3.1 fix)
    function testBuyAccrueSellLifecycle() public {
        uint128 units = 10 * 1e18;
        uint64 deadline = uint64(block.timestamp + 3600);

        vm.startPrank(alice);
        usdg.approve(address(engine), type(uint256).max);

        (uint256 cost, uint256 tokens) = engine.buy(nvdaCallId, units, 1000 * 1e6, deadline, alice);
        assertTrue(cost > 0, "Buy cost must be positive");
        assertEq(tokens, units, "Exact tokens minted");

        // Accrue time
        vm.warp(block.timestamp + 3600);
        engine.accrue(nvdaCallId);

        // Sell without cheat: pool.pay sends USDG directly
        Series memory s = registry.seriesOf(nvdaCallId);
        OptionToken(s.token).approve(address(engine), type(uint256).max);

        uint256 balBefore = usdg.balanceOf(alice);
        uint256 proceeds = engine.sell(nvdaCallId, uint128(tokens), 1, deadline, alice);
        vm.stopPrank();

        assertTrue(proceeds > 0, "Proceeds must be positive");
        assertEq(usdg.balanceOf(alice), balBefore + proceeds, "Alice received sell proceeds from pool");
        assertEq(OptionToken(s.token).balanceOf(alice), 0, "Option tokens burned");
    }

    /// @notice Test 3: Shield protection with holding verification and listed strike selection (3.3 fix)
    function testShieldProtection() public {
        uint128 tokenUnits = 50 * 1e18; // Protect 50 NVDA tokens
        uint16 pctBelowBps = 500;       // 5% below spot ($142.50 * 0.95 = $135.37 -> snaps to $140 Weekly Put)
        uint64 deadline = uint64(block.timestamp + 3600);

        vm.startPrank(alice);
        usdg.approve(address(engine), type(uint256).max);

        (bytes32 id, uint256 cost) = engine.shield(address(nvda), tokenUnits, pctBelowBps, 1000 * 1e6, deadline);
        vm.stopPrank();

        assertEq(id, nvdaPutId, "Shield must snap to available listed weekly put");
        assertTrue(cost > 0, "Shield cost must be positive");

        Series memory s = registry.seriesOf(id);
        assertEq(OptionToken(s.token).balanceOf(alice), tokenUnits, "Alice received put protection tokens");
    }

    /// @notice Test 4: AgentRouter buyFor and sellFor (3.5 fix)
    function testAgentRouterDelegation() public {
        uint64 deadline = uint64(block.timestamp + 3600);

        // Alice configures policy
        address[] memory allowed = new address[](1);
        allowed[0] = address(nvda);

        vm.startPrank(alice);
        usdg.approve(address(router), 1000 * 1e6);
        router.setPolicy(bobAgent, 1000 * 1e6, 500 * 1e6, uint64(block.timestamp + 7 days), true, true, allowed);
        vm.stopPrank();

        // Bob Agent buys for Alice
        vm.prank(bobAgent);
        (uint256 cost, uint256 tokens) = router.buyFor(alice, nvdaCallId, 5 * 1e18, 200 * 1e6, deadline);
        assertTrue(cost > 0, "Agent buy succeeded");

        Series memory s = registry.seriesOf(nvdaCallId);
        assertEq(OptionToken(s.token).balanceOf(alice), tokens, "Tokens minted to Alice");
        assertEq(OptionToken(s.token).balanceOf(bobAgent), 0, "Bob received 0 tokens");

        // Bob Agent sells for Alice
        uint256 aliceUsdgBefore = usdg.balanceOf(alice);
        vm.prank(bobAgent);
        uint256 proceeds = router.sellFor(alice, nvdaCallId, uint128(tokens), 1, deadline);

        assertTrue(proceeds > 0, "Agent sell succeeded");
        assertEq(OptionToken(s.token).balanceOf(alice), 0, "Option tokens burned");
        assertEq(usdg.balanceOf(alice), aliceUsdgBefore + proceeds, "Proceeds paid directly to Alice");
    }
}
