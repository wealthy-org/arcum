// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
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

contract MockUSDG is ERC20 {
    constructor() ERC20("USDG", "USDG") {
        _mint(msg.sender, 10000000 * 1e6); // 10M USDG (6 decimals)
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ArcumEngineTest is Test {
    ArcumEngine engine;
    SeriesRegistry registry;
    PriceGuard priceGuard;
    MockUSDG usdg;

    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address buyer = address(0x1111);
    address pool = address(0x2222);

    bytes32 seriesId;

    function setUp() public {
        usdg = new MockUSDG();
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

        realPool.setModules(IOptionEngine(address(engine)), IReserve(address(0)), IFeeRouter(address(0)), IPriceReference(address(0)));

        registry.setEngine(address(engine));
        registry.setAllowedStock(NVDA, true);

        // Setup mock price: NVDA at $145 WAD
        priceGuard.setMockPrice(NVDA, 145 * 1e18);

        // List series: NVDA Up (Call), Strike $145 WAD, Daily (86400s)
        seriesId = registry.listSeries(NVDA, true, 145 * 1e18, 86400);

        // Warp to Thursday 11:00 AM ET (Regular NYSE Trading Session)
        vm.warp(4 * 86400 + 54000);

        // Fund buyer and pool
        usdg.mint(buyer, 10000 * 1e6); // 10k USDG
        usdg.mint(pool, 100000 * 1e6); // 100k USDG in pool
    }

    function testBuyUpOption() public {
        uint128 units = 10 * 1e18; // 10 whole stock units
        uint64 deadline = uint64(block.timestamp + 3600);

        vm.startPrank(buyer);
        usdg.approve(address(engine), type(uint256).max);

        (uint256 costUsdg, uint256 tokensMinted) = engine.buy(seriesId, units, 1000 * 1e6, deadline, buyer);
        vm.stopPrank();

        assertTrue(costUsdg > 0, "Cost must be > 0 USDG");
        assertEq(tokensMinted, units, "Tokens minted must equal units");

        // Verify pool received USDG
        assertEq(usdg.balanceOf(pool), 100000 * 1e6 + costUsdg);

        // Verify buyer received OptionToken
        Series memory s = registry.seriesOf(seriesId);
        assertEq(OptionToken(s.token).balanceOf(buyer), units);
    }

    function testSellOption() public {
        // First buy
        uint128 units = 10 * 1e18;
        uint64 deadline = uint64(block.timestamp + 3600);

        vm.startPrank(buyer);
        usdg.approve(address(engine), type(uint256).max);
        engine.buy(seriesId, units, 1000 * 1e6, deadline, buyer);
        vm.stopPrank();

        // Now sell without any cheat: real WriterPool pays proceeds directly
        vm.startPrank(buyer);
        Series memory s = registry.seriesOf(seriesId);
        OptionToken(s.token).approve(address(engine), type(uint256).max);

        uint256 proceeds = engine.sell(seriesId, units, 1, deadline, buyer);
        vm.stopPrank();

        assertTrue(proceeds > 0, "Proceeds must be > 0");
        assertEq(OptionToken(s.token).balanceOf(buyer), 0, "OptionTokens must be burned");
    }

    function testQueuedSellOnMarketHalt() public {
        // Buy first
        uint128 units = 10 * 1e18;
        uint64 deadline = uint64(block.timestamp + 3600);

        vm.startPrank(buyer);
        usdg.approve(address(engine), type(uint256).max);
        engine.buy(seriesId, units, 1000 * 1e6, deadline, buyer);

        // Set market halt
        vm.stopPrank();
        priceGuard.setMarketHalt(NVDA, true);

        // Try to sell during halt -> must queue
        vm.startPrank(buyer);
        Series memory s = registry.seriesOf(seriesId);
        OptionToken(s.token).approve(address(engine), type(uint256).max);

        uint256 proceeds = engine.sell(seriesId, units, 0, deadline, buyer);
        vm.stopPrank();

        assertEq(proceeds, 0, "Immediate proceeds must be 0 on queued sell");
        (bytes32 queuedSeries, address seller, , uint128 queuedTokens, ) = engine.queuedSells(1);
        assertEq(queuedSeries, seriesId);
        assertEq(seller, buyer);
        assertEq(queuedTokens, units);
    }

    function testLiabilityAndNetGreeksTracking() public {
        // Initial state: 0 liability and 0 greeks
        assertEq(engine.totalLiability(), 0, "Initial liability must be 0");
        assertEq(engine.bookValue(), 0, "Initial bookValue must be 0");
        (int256 d0, int256 g0, ) = engine.netGreeks(NVDA);
        assertEq(d0, 0, "Initial delta must be 0");
        assertEq(g0, 0, "Initial gamma must be 0");

        // Buy 10 units
        uint128 units = 10 * 1e18;
        uint64 deadline = uint64(block.timestamp + 3600);

        vm.startPrank(buyer);
        usdg.approve(address(engine), type(uint256).max);
        engine.buy(seriesId, units, 1000 * 1e6, deadline, buyer);
        vm.stopPrank();

        // Verify active liability and greeks
        uint256 liability = engine.totalLiability();
        assertTrue(liability > 0, "Liability must be positive when series has active supply");
        assertEq(engine.bookValue(), liability, "Book value must match total liability");

        (int256 d1, int256 g1, ) = engine.netGreeks(NVDA);
        assertTrue(d1 > 0, "Call delta must be positive");
        assertTrue(g1 > 0, "Gamma must be positive");

        // Sell the 10 units directly through real WriterPool
        vm.startPrank(buyer);
        Series memory s = registry.seriesOf(seriesId);
        OptionToken(s.token).approve(address(engine), type(uint256).max);
        engine.sell(seriesId, units, 1, deadline, buyer);
        vm.stopPrank();

        // Verify liability reset to 0
        assertEq(engine.totalLiability(), 0, "Liability must reset to 0 after full sale");
        assertEq(engine.bookValue(), 0, "Book value must reset to 0 after full sale");
        (int256 d2, int256 g2, ) = engine.netGreeks(NVDA);
        assertEq(d2, 0, "Delta must reset to 0");
        assertEq(g2, 0, "Gamma must reset to 0");
    }
}
