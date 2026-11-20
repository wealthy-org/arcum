// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ArcumAccount} from "../src/aa/ArcumAccount.sol";
import {ArcumAccountFactory} from "../src/aa/ArcumAccountFactory.sol";
import {ArcumPaymaster} from "../src/aa/ArcumPaymaster.sol";
import {IEntryPoint, PackedUserOperation} from "../src/aa/IEntryPoint.sol";

contract Counter {
    uint256 public n;

    function increment() external {
        n += 1;
    }
}

/// @notice Runs against the real ERC-4337 v0.7 EntryPoint deployed on Robinhood Chain Testnet (46630), not a mock.
/// That is the point: "account abstraction works" is only a fact if the canonical EntryPoint accepted our userOperation.
contract ArcumAATest is Test {
    address constant ENTRY_POINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    IEntryPoint entryPoint;
    ArcumAccountFactory factory;
    Counter counter;

    uint256 ownerPk = 0xA11CE;
    address owner;
    address payable beneficiary = payable(address(0xB0B));

    function setUp() public {
        vm.createSelectFork(vm.envOr("RH_TESTNET_RPC", string("https://rpc.testnet.chain.robinhood.com")));
        require(ENTRY_POINT_V07.code.length > 0, "EntryPoint v0.7 missing on this fork");
        entryPoint = IEntryPoint(ENTRY_POINT_V07);
        owner = vm.addr(ownerPk);
        factory = new ArcumAccountFactory(entryPoint);
        counter = new Counter();
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    function _pack(uint128 high, uint128 low) internal pure returns (bytes32) {
        return bytes32((uint256(high) << 128) | uint256(low));
    }

    function _sign(uint256 pk, bytes32 userOpHash) internal pure returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _op(address sender, uint256 nonce, bytes memory callData, bytes memory paymasterAndData)
        internal
        pure
        returns (PackedUserOperation memory)
    {
        return PackedUserOperation({
            sender: sender,
            nonce: nonce,
            initCode: "",
            callData: callData,
            accountGasLimits: _pack(400_000, 200_000),
            preVerificationGas: 100_000,
            gasFees: _pack(1 gwei, 100 gwei),
            paymasterAndData: paymasterAndData,
            signature: ""
        });
    }

    function _settle(PackedUserOperation memory op, uint256 pk) internal {
        bytes32 userOpHash = entryPoint.getUserOpHash(op);
        op.signature = _sign(pk, userOpHash);
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;
        vm.txGasPrice(100 gwei);
        entryPoint.handleOps(ops, beneficiary);
    }

    // ---------------------------------------------------------------------
    // Account
    // ---------------------------------------------------------------------

    function test_factoryAddressIsDeterministic() public {
        address predicted = factory.getAddress(owner, 0);
        ArcumAccount account = factory.createAccount(owner, 0);
        assertEq(address(account), predicted, "counterfactual address must match");
        assertEq(account.owner(), owner);
        assertEq(address(account.entryPoint()), ENTRY_POINT_V07);
        vm.expectRevert(abi.encodeWithSelector(ArcumAccountFactory.AccountAlreadyExists.selector, predicted));
        factory.createAccount(owner, 0);
    }

    function test_userOpExecutesThroughRealEntryPoint() public {
        ArcumAccount account = factory.createAccount(owner, 0);
        entryPoint.depositTo{value: 1 ether}(address(account));
        assertEq(counter.n(), 0);

        PackedUserOperation memory op = _op(
            address(account),
            entryPoint.getNonce(address(account), 0),
            abi.encodeCall(ArcumAccount.execute, (address(counter), 0, abi.encodeCall(Counter.increment, ()))),
            ""
        );
        _settle(op, ownerPk);

        assertEq(counter.n(), 1, "userOperation must execute");
        assertEq(entryPoint.getNonce(address(account), 0), 1, "nonce must advance");
    }

    function test_executeBatchIsAtomic() public {
        ArcumAccount account = factory.createAccount(owner, 0);
        entryPoint.depositTo{value: 1 ether}(address(account));
        Counter second = new Counter();

        address[] memory dest = new address[](2);
        uint256[] memory value = new uint256[](2);
        bytes[] memory func = new bytes[](2);
        dest[0] = address(counter);
        dest[1] = address(second);
        func[0] = abi.encodeCall(Counter.increment, ());
        func[1] = abi.encodeCall(Counter.increment, ());

        PackedUserOperation memory op = _op(
            address(account),
            entryPoint.getNonce(address(account), 0),
            abi.encodeCall(ArcumAccount.executeBatch, (dest, value, func)),
            ""
        );
        _settle(op, ownerPk);
        assertEq(counter.n(), 1);
        assertEq(second.n(), 1);
    }

    function test_wrongSignerIsRejectedByEntryPoint() public {
        ArcumAccount account = factory.createAccount(owner, 0);
        entryPoint.depositTo{value: 1 ether}(address(account));

        PackedUserOperation memory op = _op(
            address(account),
            entryPoint.getNonce(address(account), 0),
            abi.encodeCall(ArcumAccount.execute, (address(counter), 0, abi.encodeCall(Counter.increment, ()))),
            ""
        );
        bytes32 userOpHash = entryPoint.getUserOpHash(op);
        op.signature = _sign(0xBAD, userOpHash); // not the owner
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;
        vm.txGasPrice(100 gwei);
        vm.expectRevert(); // FailedOp(AA24 signature error)
        entryPoint.handleOps(ops, beneficiary);
        assertEq(counter.n(), 0);
    }

    function test_ownerRotationThroughUserOp() public {
        ArcumAccount account = factory.createAccount(owner, 0);
        entryPoint.depositTo{value: 1 ether}(address(account));
        uint256 newPk = 0xB0B0;
        address newOwner = vm.addr(newPk);

        // The account is its own owner, so the rotation is a self-call driven by a signed userOp.
        PackedUserOperation memory op = _op(
            address(account),
            entryPoint.getNonce(address(account), 0),
            abi.encodeCall(ArcumAccount.execute, (address(account), 0, abi.encodeCall(ArcumAccount.setOwner, (newOwner)))),
            ""
        );
        _settle(op, ownerPk);
        assertEq(account.owner(), newOwner, "rotation must land");

        PackedUserOperation memory next = _op(
            address(account),
            entryPoint.getNonce(address(account), 0),
            abi.encodeCall(ArcumAccount.execute, (address(counter), 0, abi.encodeCall(Counter.increment, ()))),
            ""
        );
        _settle(next, newPk);
        assertEq(counter.n(), 1, "new owner must be able to drive the account");

        // Old key no longer works.
        PackedUserOperation memory stale = _op(
            address(account),
            entryPoint.getNonce(address(account), 0),
            abi.encodeCall(ArcumAccount.execute, (address(counter), 0, abi.encodeCall(Counter.increment, ()))),
            ""
        );
        bytes32 h = entryPoint.getUserOpHash(stale);
        stale.signature = _sign(ownerPk, h);
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = stale;
        vm.txGasPrice(100 gwei);
        vm.expectRevert();
        entryPoint.handleOps(ops, beneficiary);
    }

    // ---------------------------------------------------------------------
    // Paymaster
    // ---------------------------------------------------------------------

    function _fundedPaymaster(ArcumAccount account) internal returns (ArcumPaymaster paymaster) {
        vm.deal(address(this), 10 ether);
        paymaster = new ArcumPaymaster(entryPoint);
        paymaster.deposit{value: 2 ether}();
        paymaster.setBudget(address(account), 0.2 ether);
    }

    function test_paymasterSponsorsUserOp() public {
        ArcumAccount account = factory.createAccount(owner, 0); // no ETH, no EntryPoint deposit of its own
        ArcumPaymaster paymaster = _fundedPaymaster(account);

        bytes memory pmData = abi.encodePacked(address(paymaster), uint128(200_000), uint128(200_000));
        PackedUserOperation memory op = _op(
            address(account),
            entryPoint.getNonce(address(account), 0),
            abi.encodeCall(ArcumAccount.execute, (address(counter), 0, abi.encodeCall(Counter.increment, ()))),
            pmData
        );
        _settle(op, ownerPk);

        assertEq(counter.n(), 1, "sponsored op must execute");
        assertLt(paymaster.budgetOf(address(account)), 0.2 ether, "budget must be charged");
        assertGt(paymaster.totalSponsored(), 0);
    }

    function test_paymasterRefusesAccountWithoutBudget() public {
        ArcumAccount account = factory.createAccount(owner, 0);
        vm.deal(address(this), 10 ether);
        ArcumPaymaster paymaster = new ArcumPaymaster(entryPoint);
        paymaster.deposit{value: 2 ether}(); // funded, but this account has no budget

        bytes memory pmData = abi.encodePacked(address(paymaster), uint128(200_000), uint128(200_000));
        PackedUserOperation memory op = _op(
            address(account),
            entryPoint.getNonce(address(account), 0),
            abi.encodeCall(ArcumAccount.execute, (address(counter), 0, abi.encodeCall(Counter.increment, ()))),
            pmData
        );
        bytes32 h = entryPoint.getUserOpHash(op);
        op.signature = _sign(ownerPk, h);
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;
        vm.txGasPrice(100 gwei);
        vm.expectRevert();
        entryPoint.handleOps(ops, beneficiary);
        assertEq(counter.n(), 0);
    }

    function test_paymasterAdminSurface() public {
        ArcumPaymaster paymaster = new ArcumPaymaster(entryPoint);
        vm.deal(address(this), 1 ether);
        paymaster.deposit{value: 0.5 ether}();

        vm.prank(address(0xDEAD));
        vm.expectRevert();
        paymaster.setBudget(address(0x1), 1 ether);

        vm.prank(address(0xDEAD));
        vm.expectRevert();
        paymaster.deposit{value: 0.1 ether}();

        assertEq(paymaster.depositBalance(), 0.5 ether);
        assertEq(paymaster.owner(), address(this));
    }
}