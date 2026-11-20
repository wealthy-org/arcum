// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";

interface ITimelockView {
    function grantRole(bytes32 role, address account) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getMinDelay() external view returns (uint256);
    function hashOperationBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) external pure returns (bytes32);
    function isOperation(bytes32 id) external view returns (bool);
    function isOperationPending(bytes32 id) external view returns (bool);
    function isOperationReady(bytes32 id) external view returns (bool);
    function isOperationDone(bytes32 id) external view returns (bool);
}

interface IOwnableView {
    function owner() external view returns (address);
}

/**
 * @notice Prints — and checks — the exact timelock batch that hands the protocol to the Safe.
 *
 * This script never broadcasts and needs no private key, because the proposer key lives in the
 * owner's MetaMask on their phone, not on this machine. The same calldata is what
 * `app/ops/handover/config.js` embeds for the signing page, so the script is the auditable
 * description of what the phone will actually send.
 *
 * The batch, executed by the timelock itself 48 hours after scheduling:
 *   1. grantRole(PROPOSER_ROLE,  safe)
 *   2. grantRole(EXECUTOR_ROLE,  safe)
 *   3. grantRole(CANCELLER_ROLE, safe)
 *   4. VolOracle.transferOwnership(safe)
 *   5. KeeperTwapReference.transferOwnership(safe)
 *   6. ArcumPaymaster.transferOwnership(safe)
 *
 * All six go in ONE batch on purpose: the timelock already administers itself, so it can grant
 * roles and transfer ownership in the same execution. Splitting them would cost a second 48 h
 * wait for no benefit.
 *
 * `test/SafeHandover.t.sol` runs this exact sequence against a fork of the live chain and
 * asserts the end state (Safe owns all three, the old EOA holds no role).
 *
 * Usage:
 *   forge script script/SafeHandover.s.sol:SafeHandover --rpc-url $RH_TESTNET_RPC
 */
contract SafeHandover is Script {
    address internal constant TIMELOCK = 0x249ACeb7d446F5f0375e6E6b6F3b88f88e399E6b;
    address internal constant VOL_ORACLE = 0x09f2B03288A72C5B6F31B9Db19548aca42116B81;
    address internal constant TWAP = 0xAC66B9cb14765cF581AcD28870a1117973372FCF;
    address internal constant PAYMASTER = 0xe9E30Cc7E32bd55959d8bb109aecc9344a611Cb7;

    bytes32 internal constant DEFAULT_ADMIN_ROLE = bytes32(0);
    bytes32 internal constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 internal constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 internal constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");

    function run() external view {
        address safe = vm.envAddress("SAFE_ADDRESS");
        ITimelockView tl = ITimelockView(TIMELOCK);

        address[] memory targets = new address[](6);
        uint256[] memory values = new uint256[](6);
        bytes[] memory payloads = new bytes[](6);

        targets[0] = TIMELOCK;
        payloads[0] = abi.encodeCall(ITimelockView.grantRole, (PROPOSER_ROLE, safe));
        targets[1] = TIMELOCK;
        payloads[1] = abi.encodeCall(ITimelockView.grantRole, (EXECUTOR_ROLE, safe));
        targets[2] = TIMELOCK;
        payloads[2] = abi.encodeCall(ITimelockView.grantRole, (CANCELLER_ROLE, safe));
        targets[3] = VOL_ORACLE;
        payloads[3] = abi.encodeWithSignature("transferOwnership(address)", safe);
        targets[4] = TWAP;
        payloads[4] = abi.encodeWithSignature("transferOwnership(address)", safe);
        targets[5] = PAYMASTER;
        payloads[5] = abi.encodeWithSignature("transferOwnership(address)", safe);

        bytes32 opId = tl.hashOperationBatch(
            targets, values, payloads, bytes32(0), bytes32(0)
        );

        console2.log("safe          ", safe);
        console2.log("timelock      ", TIMELOCK);
        console2.log("minDelay      ", tl.getMinDelay());
        console2.log("selfAdmin     ", tl.hasRole(DEFAULT_ADMIN_ROLE, TIMELOCK));
        console2.log("safe proposer ", tl.hasRole(PROPOSER_ROLE, safe));
        console2.log("safe executor ", tl.hasRole(EXECUTOR_ROLE, safe));
        console2.log("volOracle own ", IOwnableView(VOL_ORACLE).owner());
        console2.log("twap own      ", IOwnableView(TWAP).owner());
        console2.log("paymaster own ", IOwnableView(PAYMASTER).owner());
        console2.log("opId          ");
        console2.logBytes32(opId);
        console2.log("scheduled     ", tl.isOperation(opId));
        console2.log("pending       ", tl.isOperationPending(opId));
        console2.log("ready         ", tl.isOperationReady(opId));
        console2.log("done          ", tl.isOperationDone(opId));

        require(tl.hasRole(DEFAULT_ADMIN_ROLE, TIMELOCK), "timelock cannot administer itself");
        require(IOwnableView(VOL_ORACLE).owner() == TIMELOCK, "volOracle owner is not timelock");
        require(IOwnableView(TWAP).owner() == TIMELOCK, "twap owner is not timelock");
        require(IOwnableView(PAYMASTER).owner() == TIMELOCK, "paymaster owner is not timelock");
        require(!tl.isOperationDone(opId), "already executed");

        console2.log("");
        console2.log("the signing page must show this opId; if it differs, stop");
    }
}
