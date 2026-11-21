// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";

interface ITimelockFull {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
    function getMinDelay() external view returns (uint256);
    function scheduleBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external;
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) external payable;
    function hashOperationBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) external pure returns (bytes32);
    function isOperationReady(bytes32 id) external view returns (bool);
    function isOperationDone(bytes32 id) external view returns (bool);
}

interface IOwnable2Step {
    function owner() external view returns (address);
    function pendingOwner() external view returns (address);
    function transferOwnership(address newOwner) external;
    function acceptOwnership() external;
}

/**
 * @notice Proves the Safe handover path on a fork of the real chain, before a single wei is
 *         spent or a single MetaMask prompt is shown.
 *
 * What it demonstrates, in order:
 *   1. The proposer EOA can schedule one batch that gives the timelock admin over itself and
 *      gives the Safe PROPOSER + EXECUTOR. This is the only step that needs the EOA key.
 *   2. After exactly the timelock's own delay, that batch executes.
 *   3. The timelock (now able to act on itself) transfers ownership of VolOracle,
 *      KeeperTwapReference and ArcumPaymaster to the Safe, and the Safe accepts.
 *   4. The EOA renounces PROPOSER/EXECUTOR/CANCELLER, so `hasRole` is false for every role.
 *
 * Failure of this test means the handover would brick partway, so it runs before the prompt.
 */
contract SafeHandoverForkTest is Test {
    address constant TIMELOCK = 0x249ACeb7d446F5f0375e6E6b6F3b88f88e399E6b;
    address constant SAFE = 0xf2EFC16D920175C8805fCF21DcD0c420691b60db;
    address constant PROPOSER_EOA = 0x08f4C59079160385e3FBe00Eede656e22C2dD90B;
    address constant VOL_ORACLE = 0x09f2B03288A72C5B6F31B9Db19548aca42116B81;
    address constant TWAP = 0xAC66B9cb14765cF581AcD28870a1117973372FCF;
    address constant PAYMASTER = 0xe9E30Cc7E32bd55959d8bb109aecc9344a611Cb7;

    bytes32 constant ADMIN = bytes32(0);
    bytes32 constant PROPOSER = keccak256("PROPOSER_ROLE");
    bytes32 constant EXECUTOR = keccak256("EXECUTOR_ROLE");
    bytes32 constant CANCELLER = keccak256("CANCELLER_ROLE");

    ITimelockFull tl = ITimelockFull(TIMELOCK);

    function setUp() public {
        if (vm.envOr("SKIP_FORK_TESTS", false)) {
            vm.skip(true);
            return;
        }
        string memory rpc = vm.envOr("RH_TESTNET_RPC", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(rpc);
    }

    function _rolesBatch() internal view returns (address[] memory t, uint256[] memory v, bytes[] memory p) {
        bool needsAdmin = !tl.hasRole(ADMIN, TIMELOCK);
        bool needsProposer = !tl.hasRole(PROPOSER, SAFE);
        bool needsExecutor = !tl.hasRole(EXECUTOR, SAFE);

        uint256 n = (needsAdmin ? 1 : 0) + (needsProposer ? 1 : 0) + (needsExecutor ? 1 : 0);
        t = new address[](n);
        v = new uint256[](n);
        p = new bytes[](n);
        uint256 i;
        if (needsAdmin) {
            t[i] = TIMELOCK;
            p[i] = abi.encodeCall(ITimelockFull.grantRole, (ADMIN, TIMELOCK));
            i++;
        }
        if (needsProposer) {
            t[i] = TIMELOCK;
            p[i] = abi.encodeCall(ITimelockFull.grantRole, (PROPOSER, SAFE));
            i++;
        }
        if (needsExecutor) {
            t[i] = TIMELOCK;
            p[i] = abi.encodeCall(ITimelockFull.grantRole, (EXECUTOR, SAFE));
            i++;
        }
    }

    function testHandover() public {
        require(tl.hasRole(PROPOSER, PROPOSER_EOA), "precondition: EOA is not proposer");
        require(tl.hasRole(ADMIN, TIMELOCK), "precondition: timelock is not self-admin");

        (address[] memory t, uint256[] memory v, bytes[] memory p) = _rolesBatch();
        require(p.length >= 2, "expected at least proposer+executor grants");

        // Step 1: the proposer EOA schedules. This is the only EOA-key step.
        // The delay is read into a local first: `vm.prank` applies to the next call, and
        // `tl.getMinDelay()` in the argument list would consume it.
        uint256 delay = tl.getMinDelay();
        vm.prank(PROPOSER_EOA);
        tl.scheduleBatch(t, v, p, bytes32(0), bytes32(0), delay);

        // Step 2: nothing may execute early.
        vm.prank(PROPOSER_EOA);
        vm.expectRevert();
        tl.executeBatch(t, v, p, bytes32(0), bytes32(0));

        // Step 3: after the timelock's own delay, it runs.
        vm.warp(block.timestamp + delay + 1);
        vm.prank(PROPOSER_EOA);
        tl.executeBatch(t, v, p, bytes32(0), bytes32(0));

        assertTrue(tl.hasRole(ADMIN, TIMELOCK), "timelock lost self-admin");
        assertTrue(tl.hasRole(PROPOSER, SAFE), "safe is not proposer");
        assertTrue(tl.hasRole(EXECUTOR, SAFE), "safe is not executor");

        // Step 4: the timelock (owner of all three) hands ownership to the Safe.
        vm.startPrank(TIMELOCK);
        IOwnable2Step(VOL_ORACLE).transferOwnership(SAFE);
        IOwnable2Step(TWAP).transferOwnership(SAFE);
        IOwnable2Step(PAYMASTER).transferOwnership(SAFE);
        vm.stopPrank();

        assertEq(IOwnable2Step(VOL_ORACLE).pendingOwner(), SAFE, "volOracle pending");
        assertEq(IOwnable2Step(TWAP).pendingOwner(), SAFE, "twap pending");
        // ArcumPaymaster is a one-step Ownable: transferOwnership takes effect immediately.
        assertEq(IOwnable2Step(PAYMASTER).owner(), SAFE, "paymaster owner (one-step)");

        // Step 5: the Safe accepts (on chain this is one owner-approved Safe transaction each).
        vm.startPrank(SAFE);
        IOwnable2Step(VOL_ORACLE).acceptOwnership();
        IOwnable2Step(TWAP).acceptOwnership();
        vm.stopPrank();

        assertEq(IOwnable2Step(VOL_ORACLE).owner(), SAFE, "volOracle owner");
        assertEq(IOwnable2Step(TWAP).owner(), SAFE, "twap owner");
        assertEq(IOwnable2Step(PAYMASTER).owner(), SAFE, "paymaster owner");

        // Step 6: the EOA gives up every timelock role. The Safe keeps PROPOSER/EXECUTOR, and
        // the timelock administers itself, so nothing needs the old key afterwards.
        vm.startPrank(PROPOSER_EOA);
        tl.renounceRole(PROPOSER, PROPOSER_EOA);
        tl.renounceRole(EXECUTOR, PROPOSER_EOA);
        tl.renounceRole(CANCELLER, PROPOSER_EOA);
        vm.stopPrank();

        assertFalse(tl.hasRole(PROPOSER, PROPOSER_EOA), "EOA still proposer");
        assertFalse(tl.hasRole(EXECUTOR, PROPOSER_EOA), "EOA still executor");
        assertFalse(tl.hasRole(CANCELLER, PROPOSER_EOA), "EOA still canceller");
        assertTrue(tl.hasRole(ADMIN, TIMELOCK), "timelock admin lost");

        console2.log("handover path proven on fork; final owner of all three:", IOwnable2Step(VOL_ORACLE).owner());
    }
}
