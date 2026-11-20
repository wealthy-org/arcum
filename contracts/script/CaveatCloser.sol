// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {VolOracle} from "../src/VolOracle.sol";
import {IVolOracle} from "../src/interfaces/IVolOracle.sol";
import {KeeperTwapReference} from "../src/KeeperTwapReference.sol";
import {ArcumAccountFactory} from "../src/aa/ArcumAccountFactory.sol";
import {ArcumPaymaster} from "../src/aa/ArcumPaymaster.sol";
import {IEntryPoint} from "../src/aa/IEntryPoint.sol";

/// @title CaveatCloser
/// @notice The actual caveat-closing orchestration, deliberately a plain contract instead of script body.
///
/// @dev Why it is not inline in `CloseCaveats.s.sol`: the handover needs the timelock to act as `msg.sender` for
/// `acceptOwnership` and `updateDelay`, and the actor that schedules those calls therefore has to be a stable address
/// with proposer/executor roles. A Forge script contract is ephemeral, and `address(this)` is rejected inside it. Doing
/// the whole wiring in one constructor keeps every nested call inside a single real transaction, which is exactly what
/// both `forge script --broadcast` and a `vm.startBroadcast` fork rehearsal can execute.
///
/// Bootstrap model, in order:
///   1. timelock with `tlInitialDelay` (normally 0), self-administered, plus this contract as bootstrapper;
///   2. VolOracle, KeeperTwapReference, ArcumAccountFactory, ArcumPaymaster deployed and configured;
///   3. ownership handed to the timelock (two-step ones accepted *by* the timelock);
///   4. `updateDelay(tlFinalDelay)` executed through the timelock, so it governs every later proposal;
///   5. this contract drops its own proposer/canceller/executor roles.
contract CaveatCloser {
    struct Params {
        address owner;
        address keeper;
        address proposer;
        address executor;
        uint256 tlInitialDelay;
        uint256 tlFinalDelay;
        address[] stocks;
        string[] symbols;
        uint64 volMinSigmaBps;
        uint64 volMaxSigmaBps;
        uint32 volMaxAge;
        uint32 volMinTtl;
        uint32 twapWindow;
        uint32 twapMinInterval;
        address entryPoint;
        uint256 paymasterDeposit;
    }

    struct Deployment {
        address timelock;
        address volOracle;
        address keeperTwap;
        address accountFactory;
        address paymaster;
        address deployer;
        uint256 deployedAt;
    }

    Deployment private _deployment;

    constructor(Params memory p) payable {
        require(p.owner != address(0), "owner required");
        require(p.keeper != address(0), "keeper required");
        require(p.entryPoint.code.length > 0, "entryPoint has no code");

        // 1. Timelock. This contract holds proposer/canceller/executor only to bootstrap; the timelock keeps
        // DEFAULT_ADMIN_ROLE on itself (OZ v5 self-administration), so no external admin key is needed.
        address[] memory proposers = new address[](2);
        proposers[0] = address(this);
        proposers[1] = p.proposer;
        address[] memory executors = new address[](2);
        executors[0] = address(this);
        executors[1] = p.executor;
        TimelockController tl = new TimelockController(p.tlInitialDelay, proposers, executors, address(this));

        // 2. Vol oracle, configured, with the keeper key separated from admin.
        VolOracle volOracle = new VolOracle();
        for (uint256 i; i < p.stocks.length; ++i) {
            volOracle.setVolConfig(
                p.stocks[i],
                IVolOracle.VolConfig({
                    minSigmaBps: p.volMinSigmaBps,
                    maxSigmaBps: p.volMaxSigmaBps,
                    maxAge: p.volMaxAge,
                    minTtl: p.volMinTtl,
                    enabled: true
                })
            );
        }
        volOracle.setPublisher(p.keeper, true);

        // 3. Keeper-fed reference price (no Uniswap pool exists for stock/USDG on the target chain).
        KeeperTwapReference twap = new KeeperTwapReference(p.twapWindow, p.twapMinInterval);
        twap.setKeeper(p.keeper, true);

        // 4. ERC-4337 stack on the canonical v0.7 EntryPoint.
        ArcumAccountFactory factory = new ArcumAccountFactory(IEntryPoint(p.entryPoint));
        ArcumPaymaster paymaster = new ArcumPaymaster(IEntryPoint(p.entryPoint));
        if (p.paymasterDeposit > 0) {
            require(msg.value >= p.paymasterDeposit, "constructor value below paymaster deposit");
            paymaster.deposit{value: p.paymasterDeposit}();
        }

        // 5. Admin transfers. Two-step owners must be accepted by the timelock itself.
        volOracle.transferOwnership(address(tl));
        twap.transferOwnership(address(tl));
        paymaster.transferOwnership(address(tl)); // single-step Ownable

        address[] memory targets = new address[](2);
        uint256[] memory values = new uint256[](2);
        bytes[] memory datas = new bytes[](2);
        targets[0] = address(volOracle);
        datas[0] = abi.encodeCall(volOracle.acceptOwnership, ());
        targets[1] = address(twap);
        datas[1] = abi.encodeCall(twap.acceptOwnership, ());
        _scheduleAndExecute(tl, p.tlInitialDelay, targets, values, datas, keccak256("arcum.close.ownership"));

        // 6. Delay raise, executed by the timelock itself (`updateDelay` is self-only). Scheduled while the bootstrap
        // delay still applies, so it lands in this same transaction and governs every proposal after it.
        address[] memory raiseTargets = new address[](1);
        uint256[] memory raiseValues = new uint256[](1);
        bytes[] memory raiseDatas = new bytes[](1);
        raiseTargets[0] = address(tl);
        raiseDatas[0] = abi.encodeCall(tl.updateDelay, (p.tlFinalDelay));
        _scheduleAndExecute(tl, p.tlInitialDelay, raiseTargets, raiseValues, raiseDatas, keccak256("arcum.close.delay"));

        // 7. Drop the bootstrap roles. After this, the only proposer/executor are the configured accounts and role
        // changes have to be timelocked proposals.
        if (address(this) != p.proposer) {
            tl.revokeRole(tl.PROPOSER_ROLE(), address(this));
            tl.revokeRole(tl.CANCELLER_ROLE(), address(this));
        }
        if (address(this) != p.executor) tl.revokeRole(tl.EXECUTOR_ROLE(), address(this));
        // The timelock stays admin of itself (OZ grants DEFAULT_ADMIN_ROLE to `address(timelock)` at construction), so
        // dropping the bootstrap admin does not leave the timelock ungovernable.
        tl.revokeRole(tl.DEFAULT_ADMIN_ROLE(), address(this));

        _deployment = Deployment({
            timelock: address(tl),
            volOracle: address(volOracle),
            keeperTwap: address(twap),
            accountFactory: address(factory),
            paymaster: address(paymaster),
            deployer: msg.sender,
            deployedAt: block.timestamp
        });
    }

    /// @notice Addresses produced by the bootstrap, read by the script and by the fork rehearsal.
    function deployment() external view returns (Deployment memory) {
        return _deployment;
    }

    function _scheduleAndExecute(
        TimelockController tl,
        uint256 bootstrapDelay,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory datas,
        bytes32 salt
    ) internal {
        tl.scheduleBatch(targets, values, datas, bytes32(0), salt, bootstrapDelay);
        tl.executeBatch(targets, values, datas, bytes32(0), salt);
    }
}