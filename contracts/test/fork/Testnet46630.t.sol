// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {IOptionEngine} from "../../src/interfaces/IOptionEngine.sol";
import {ISeriesRegistry} from "../../src/interfaces/ISeriesRegistry.sol";
import {IPool} from "../../src/interfaces/IPool.sol";
import {IAgentRouter} from "../../src/interfaces/IAgentRouter.sol";
import {AgentRouter} from "../../src/AgentRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Series} from "../../src/libs/OptionTypes.sol";

/// @title Testnet46630ForkTest
/// @notice Real fork test connecting to testnet 46630 and testing deployed contracts
contract Testnet46630ForkTest is Test {
    IOptionEngine engine;
    ISeriesRegistry reg;
    IPool pool;
    IAgentRouter router;
    IERC20 usdg;
    address nvda;

    address user = makeAddr("user");
    address agent = makeAddr("agent");

    function setUp() public {
        vm.createSelectFork(vm.envOr("RH_TESTNET_RPC", string("https://rpc.testnet.chain.robinhood.com")));
        string memory j = vm.readFile("../deployments/46630.json");
        engine = IOptionEngine(vm.parseJsonAddress(j, ".engineProxy"));
        reg    = ISeriesRegistry(vm.parseJsonAddress(j, ".seriesRegistry"));
        pool   = IPool(vm.parseJsonAddress(j, ".writerPoolProxy"));
        // Test updated AgentRouter connected to real deployed testnet engine & registry
        router = new AgentRouter(address(engine));
        usdg   = IERC20(vm.parseJsonAddress(j, ".usdg"));
        nvda   = vm.parseJsonAddress(j, ".nvda");

        deal(address(usdg), user, 100_000e6);
        deal(nvda, user, 100e18);

        // Warp to active NYSE trading window (Thursday 11:30 AM EDT / 15:30 UTC)
        uint256 current = block.timestamp;
        uint256 warpTime = (current / 604800) * 604800 + 4 * 86400 + 55800;
        if (warpTime < current) warpTime += 604800;
        vm.warp(warpTime);
    }

    function test_buy_sell_roundtrip() public {
        bytes32 id = reg.idOf(nvda, true, 141e18, 86400);
        Series memory s = reg.seriesOf(id);
        require(s.buyable, "Series must be buyable");

        vm.startPrank(user);
        usdg.approve(address(engine), 10_000e6);
        (uint256 cost, uint256 tokens) = engine.buy(id, 1e18, 10_000e6, uint64(block.timestamp + 600), user);
        assertGt(tokens, 0, "Tokens minted");
        assertGt(cost, 0, "Cost paid");

        address token = s.token;
        uint256 bal = IERC20(token).balanceOf(user);
        assertEq(bal, tokens, "Balance matches minted");

        // Now sell the option
        uint256 proceeds = engine.sell(id, uint128(bal), 0, uint64(block.timestamp + 600), user);
        assertGt(proceeds, 0, "Proceeds received");
        assertEq(IERC20(token).balanceOf(user), 0, "All tokens burned on sell");
        vm.stopPrank();
    }

    function test_pool_deposit_request_claim() public {
        vm.startPrank(user);
        usdg.approve(address(pool), 5_000e6);
        uint256 shares = pool.deposit(5_000e6, user);
        assertGt(shares, 0, "Shares received");

        // Warp past deposit lock
        vm.warp(block.timestamp + 1801);

        uint256 ticket = pool.requestWithdraw(shares);
        assertGt(ticket, 0, "Ticket opened");

        // Warp past queue delay
        vm.warp(block.timestamp + 3600);

        uint256 usdgBalBefore = usdg.balanceOf(user);
        uint256 claimed = pool.claim(ticket);
        assertGt(claimed, 0, "USDG claimed");
        assertEq(usdg.balanceOf(user), usdgBalBefore + claimed, "User balance increased");
        vm.stopPrank();
    }

    function test_shield_direct() public {
        vm.startPrank(user);
        usdg.approve(address(engine), 5_000e6);
        (bytes32 id, uint256 cost) = engine.shield(nvda, 10e18, 500, 5_000e6, uint64(block.timestamp + 600));
        assertGt(cost, 0, "Cost paid for shield");
        assertTrue(id != bytes32(0), "Valid series id");
        vm.stopPrank();
    }

    function test_shieldFor_agent() public {
        address[] memory allowedStocks = new address[](1);
        allowedStocks[0] = nvda;

        vm.startPrank(user);
        usdg.approve(address(router), 5_000e6);
        router.setPolicy(
            agent,
            5_000e6,
            1_000e6,
            uint64(block.timestamp + 7 days),
            true,
            true,
            allowedStocks
        );
        vm.stopPrank();

        vm.startPrank(agent);
        (bytes32 id, uint256 cost) = router.shieldFor(user, nvda, 10e18, 500, 1_000e6, uint64(block.timestamp + 600));
        assertGt(cost, 0, "Cost paid for shield via agent");
        assertTrue(id != bytes32(0), "Valid series id");
        vm.stopPrank();
    }

    function test_pool_claim_after_window_requeues() public {
        vm.startPrank(user);
        usdg.approve(address(pool), 5_000e6);
        uint256 shares = pool.deposit(5_000e6, user);
        vm.warp(block.timestamp + 1801);

        uint256 ticket = pool.requestWithdraw(shares);

        // Warp past claimableAt + CLAIM_WINDOW (7 days)
        vm.warp(block.timestamp + 8 days);

        uint256 claimed = pool.claim(ticket);
        assertEq(claimed, 0, "Expired claim returns 0 and requeues");
        vm.stopPrank();
    }

    function test_agent_policy_and_revoke() public {
        address[] memory allowedStocks = new address[](1);
        allowedStocks[0] = nvda;

        vm.startPrank(user);
        usdg.approve(address(router), 1_000e6);
        router.setPolicy(
            agent,
            1_000e6,
            500e6,
            uint64(block.timestamp + 7 days),
            true,
            true,
            allowedStocks
        );

        // Revoke
        router.revoke(agent);

        bytes32 id = reg.idOf(nvda, true, 141e18, 86400);
        vm.stopPrank();

        // Agent tries to buyFor -> must revert because policy was revoked
        vm.startPrank(agent);
        vm.expectRevert();
        router.buyFor(user, id, 1e18, 500e6, uint64(block.timestamp + 600));
        vm.stopPrank();
    }
}
