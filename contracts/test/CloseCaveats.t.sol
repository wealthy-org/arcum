// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {CaveatCloser} from "../script/CaveatCloser.sol";
import {VolOracle} from "../src/VolOracle.sol";
import {IVolOracle} from "../src/interfaces/IVolOracle.sol";
import {KeeperTwapReference} from "../src/KeeperTwapReference.sol";
import {ArcumAccountFactory} from "../src/aa/ArcumAccountFactory.sol";
import {ArcumAccount} from "../src/aa/ArcumAccount.sol";
import {ArcumPaymaster} from "../src/aa/ArcumPaymaster.sol";
import {IEntryPoint} from "../src/aa/IEntryPoint.sol";

/// @notice Rehearsal of `script/CloseCaveats.s.sol` against the live testnet fork (46630), so "the closure script runs"
/// is proven by post-conditions on real chain state instead of by a successful broadcast and a log dump.
///
/// The script body is `new CaveatCloser{value: ...}(params)`, so this test executes the same constructor under
/// `vm.startBroadcast(deployer)` — the sender and value a live `forge script --broadcast` would use.
contract CloseCaveatsTest is Test {
    address constant ENTRY_POINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    uint256 constant PAYMASTER_DEPOSIT = 0.05 ether;
    uint256 constant FINAL_DELAY = 48 hours;

    CaveatCloser closer;
    CaveatCloser.Deployment d;
    CaveatCloser.Params p;
    address keeper = makeAddr("keeper");
    address deployer = makeAddr("deployer");

    function setUp() public {
        vm.createSelectFork(vm.envOr("RH_TESTNET_RPC", string("https://rpc.testnet.chain.robinhood.com")));
        require(ENTRY_POINT_V07.code.length > 0, "EntryPoint v0.7 missing on this fork");

        string memory j = vm.readFile("../deployments/46630.json");
        address[] memory stocks = new address[](3);
        string[] memory symbols = new string[](3);
        stocks[0] = vm.parseJsonAddress(j, ".nvda");
        stocks[1] = vm.parseJsonAddress(j, ".aapl");
        stocks[2] = vm.parseJsonAddress(j, ".qqq");
        symbols[0] = "nvda";
        symbols[1] = "aapl";
        symbols[2] = "qqq";

        vm.deal(deployer, 10 ether);
        vm.deal(address(this), 10 ether);

        p = CaveatCloser.Params({
            owner: deployer,
            keeper: keeper,
            proposer: deployer,
            executor: deployer,
            tlInitialDelay: 0,
            tlFinalDelay: FINAL_DELAY,
            stocks: stocks,
            symbols: symbols,
            volMinSigmaBps: 500,
            volMaxSigmaBps: 30_000,
            volMaxAge: 7200,
            volMinTtl: 60,
            twapWindow: 3600,
            twapMinInterval: 300,
            entryPoint: ENTRY_POINT_V07,
            paymasterDeposit: PAYMASTER_DEPOSIT
        });

        vm.startBroadcast(deployer);
        closer = new CaveatCloser{value: PAYMASTER_DEPOSIT}(p);
        vm.stopBroadcast();

        d = closer.deployment();
    }

    function testEverythingEndsUpBehindTheTimelock() public {
        TimelockController tl = TimelockController(payable(d.timelock));

        assertGt(d.timelock.code.length, 0, "timelock deployed");
        assertEq(tl.getMinDelay(), FINAL_DELAY, "delay raised to 48h");
        assertTrue(tl.hasRole(tl.PROPOSER_ROLE(), p.proposer), "proposer role");
        assertTrue(tl.hasRole(tl.EXECUTOR_ROLE(), p.executor), "executor role");
        // Bootstrap only: the closer must not keep proposing/executing rights after the handover.
        assertFalse(tl.hasRole(tl.PROPOSER_ROLE(), address(closer)), "closer cannot propose");
        assertFalse(tl.hasRole(tl.EXECUTOR_ROLE(), address(closer)), "closer cannot execute");
        assertFalse(tl.hasRole(tl.CANCELLER_ROLE(), address(closer)), "closer cannot cancel");

        // Two-step ownerships must be fully accepted, not left pending: a pending owner is an unowned admin surface.
        VolOracle vol = VolOracle(d.volOracle);
        assertEq(vol.owner(), d.timelock, "volOracle owned by timelock");
        assertEq(vol.pendingOwner(), address(0), "volOracle handover accepted");

        KeeperTwapReference twap = KeeperTwapReference(d.keeperTwap);
        assertEq(twap.owner(), d.timelock, "keeperTwap owned by timelock");
        assertEq(twap.pendingOwner(), address(0), "keeperTwap handover accepted");
        assertEq(twap.window(), p.twapWindow);
        assertEq(twap.minInterval(), p.twapMinInterval);
        assertTrue(twap.isKeeper(keeper), "keeper wired to twap");

        assertEq(ArcumPaymaster(payable(d.paymaster)).owner(), d.timelock, "paymaster owned by timelock");
    }

    function testVolOracleIsConfiguredAndPublishingIsSeparatedFromAdmin() public {
        VolOracle vol = VolOracle(d.volOracle);
        for (uint256 i; i < p.stocks.length; ++i) {
            IVolOracle.VolConfig memory cfg = vol.config(p.stocks[i]);
            assertTrue(cfg.enabled, "stock enabled");
            assertEq(cfg.minSigmaBps, p.volMinSigmaBps);
            assertEq(cfg.maxSigmaBps, p.volMaxSigmaBps);
            assertEq(cfg.maxAge, p.volMaxAge);
            assertEq(cfg.minTtl, p.volMinTtl);
        }
        assertTrue(vol.isPublisher(keeper), "keeper is publisher");
        // The whole point of the closure: reconfiguring now needs a 48h proposal, not a hot-key transaction.
        vm.prank(keeper);
        vm.expectRevert();
        vol.setPublisher(keeper, false);
    }

    function testAaStackIsLiveOnTheRealEntryPoint() public {
        ArcumAccountFactory factory = ArcumAccountFactory(d.accountFactory);
        assertEq(address(factory.entryPoint()), ENTRY_POINT_V07);

        address owner = makeAddr("aaOwner");
        address predicted = factory.getAddress(owner, 7);
        ArcumAccount account = factory.createAccount(owner, 7);

        assertEq(address(account), predicted, "counterfactual address matches");
        assertEq(account.owner(), owner);
        assertEq(address(account.entryPoint()), ENTRY_POINT_V07);

        ArcumPaymaster paymaster = ArcumPaymaster(payable(d.paymaster));
        assertEq(paymaster.depositBalance(), PAYMASTER_DEPOSIT, "paymaster prefunded at the EntryPoint");
        // Sponsorship is an explicit per-account decision, not a public faucet.
        assertEq(paymaster.budgetOf(address(account)), 0);
    }

    /// @notice The raised delay must actually bite: a fresh proposal cannot execute in the block it was scheduled.
    function testRaisedDelayBlocksInstantExecution() public {
        TimelockController tl = TimelockController(payable(d.timelock));
        VolOracle vol = VolOracle(d.volOracle);

        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory datas = new bytes[](1);
        targets[0] = address(vol);
        datas[0] = abi.encodeCall(vol.setPublisher, (keeper, false));
        bytes32 salt = keccak256("late.proposal");

        vm.prank(p.proposer);
        tl.scheduleBatch(targets, values, datas, bytes32(0), salt, FINAL_DELAY);

        vm.prank(p.executor);
        vm.expectRevert(); // TimelockUnexpectedOperationState: not ready yet
        tl.executeBatch(targets, values, datas, bytes32(0), salt);

        // ... and after the delay it does execute, through the timelock, not through an EOA.
        vm.warp(block.timestamp + FINAL_DELAY);
        vm.prank(p.executor);
        tl.executeBatch(targets, values, datas, bytes32(0), salt);
        assertFalse(vol.isPublisher(keeper), "timelocked change applied");
    }
}