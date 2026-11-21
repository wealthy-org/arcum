// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";

interface ISafe {
    function getThreshold() external view returns (uint256);
    function getOwners() external view returns (address[] memory);
    function nonce() external view returns (uint256);
    function getTransactionHash(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address refundReceiver,
        uint256 _nonce
    ) external view returns (bytes32);
    function execTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address refundReceiver,
        bytes calldata signatures
    ) external payable returns (bool success);
}

interface IOwnable {
    function owner() external view returns (address);
    function pendingOwner() external view returns (address);
}

interface ISeriesRegistry {
    function seriesCount() external view returns (uint256);
    function seriesAt(uint256 index) external view returns (bytes32);
}

contract SafeMainnetActionsForkTest is Test {
    address internal constant SAFE = 0xf2EFC16D920175C8805fCF21DcD0c420691b60db;
    address internal constant MULTISEND = 0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761;
    address internal constant PRICE_GUARD = 0x13eEC2572612eA55b6cA55726FAF64a9536b210D;
    address internal constant VOL_ORACLE = 0x3aB5Adf52ae9FEb20700868Eb6D5ee077F7D1Ed5;
    address internal constant SERIES_REGISTRY = 0x3D525dbB8e7973E46023c9Ad05E6803B82AC408C;

    address internal constant STOCK_NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address internal constant STOCK_AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address internal constant STOCK_QQQ = 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68;

    address internal constant SIGNER_1 = 0x1d9FEfb992D2ceB3961D056917bA1750AA7DE6c2;
    address internal constant SIGNER_2 = 0x3279528859C4C663593431e979C646592eF67392;

    function setUp() public {
        string memory rpc = vm.envOr("RH_MAINNET_RPC", string("http://127.0.0.1:8548"));
        vm.createSelectFork(rpc);
    }

    function _buildMultiSendTransactions() internal pure returns (bytes memory) {
        bytes memory txs;

        // 1. PriceGuardProd.acceptOwnership()
        bytes memory d1 = abi.encodeWithSignature("acceptOwnership()");
        txs = abi.encodePacked(txs, uint8(0), PRICE_GUARD, uint256(0), uint256(d1.length), d1);

        // 2. VolOracle.acceptOwnership()
        bytes memory d2 = abi.encodeWithSignature("acceptOwnership()");
        txs = abi.encodePacked(txs, uint8(0), VOL_ORACLE, uint256(0), uint256(d2.length), d2);

        // 3. SeriesRegistry.listSeries(NVDA, call, 155, 86400)
        bytes memory d3 = abi.encodeWithSignature(
            "listSeries(address,bool,uint128,uint32)",
            STOCK_NVDA, true, uint128(155 * 1e18), uint32(86400)
        );
        txs = abi.encodePacked(txs, uint8(0), SERIES_REGISTRY, uint256(0), uint256(d3.length), d3);

        // 4. SeriesRegistry.listSeries(AAPL, call, 355, 86400)
        bytes memory d4 = abi.encodeWithSignature(
            "listSeries(address,bool,uint128,uint32)",
            STOCK_AAPL, true, uint128(355 * 1e18), uint32(86400)
        );
        txs = abi.encodePacked(txs, uint8(0), SERIES_REGISTRY, uint256(0), uint256(d4.length), d4);

        // 5. SeriesRegistry.listSeries(QQQ, call, 655, 86400)
        bytes memory d5 = abi.encodeWithSignature(
            "listSeries(address,bool,uint128,uint32)",
            STOCK_QQQ, true, uint128(655 * 1e18), uint32(86400)
        );
        txs = abi.encodePacked(txs, uint8(0), SERIES_REGISTRY, uint256(0), uint256(d5.length), d5);

        return txs;
    }

    function test_fork_safeExecutesOwnershipAndSeriesListing() public {
        bytes memory multiSendTxs = _buildMultiSendTransactions();
        bytes memory multiSendData = abi.encodeWithSignature("multiSend(bytes)", multiSendTxs);

        bytes32 txHash = ISafe(SAFE).getTransactionHash(
            MULTISEND,
            0,
            multiSendData,
            1, // DELEGATECALL
            0, 0, 0, address(0), address(0),
            ISafe(SAFE).nonce()
        );

        // Simulate signatures from Signer 1 and Signer 2 via eth_sign / contract approved hash
        // In Gnosis Safe, pre-approved hashes or sorted owner signatures are valid.
        // We use vm.prank from the Safe owners to approve the hash:
        vm.prank(SIGNER_1);
        (bool ok1,) = SAFE.call(abi.encodeWithSignature("approveHash(bytes32)", txHash));
        assertTrue(ok1, "approveHash 1 failed");

        vm.prank(SIGNER_2);
        (bool ok2,) = SAFE.call(abi.encodeWithSignature("approveHash(bytes32)", txHash));
        assertTrue(ok2, "approveHash 2 failed");

        // Format signatures for 2 approved hashes (v=1, r=owner, s=0)
        // Signers must be sorted: SIGNER_1 < SIGNER_2
        bytes memory sig1 = abi.encodePacked(bytes32(uint256(uint160(SIGNER_1))), bytes32(0), uint8(1));
        bytes memory sig2 = abi.encodePacked(bytes32(uint256(uint160(SIGNER_2))), bytes32(0), uint8(1));
        bytes memory signatures = abi.encodePacked(sig1, sig2);

        // Execute transaction through any relayer
        vm.prank(address(0x1234));
        bool success = ISafe(SAFE).execTransaction(
            MULTISEND,
            0,
            multiSendData,
            1, // DELEGATECALL
            0, 0, 0, address(0), address(0),
            signatures
        );
        assertTrue(success, "Safe execTransaction failed");

        // Verify D3: PriceGuard and VolOracle ownership accepted
        assertEq(IOwnable(PRICE_GUARD).owner(), SAFE, "PriceGuard owner != Safe");
        assertEq(IOwnable(PRICE_GUARD).pendingOwner(), address(0), "PriceGuard pendingOwner != 0");
        assertEq(IOwnable(VOL_ORACLE).owner(), SAFE, "VolOracle owner != Safe");
        assertEq(IOwnable(VOL_ORACLE).pendingOwner(), address(0), "VolOracle pendingOwner != 0");

        // Verify D4: SeriesRegistry series listed
        uint256 count = ISeriesRegistry(SERIES_REGISTRY).seriesCount();
        assertEq(count, 3, "seriesCount != 3");
    }
}
