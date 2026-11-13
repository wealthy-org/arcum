// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {VmSafe} from "forge-std/Vm.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {MockStock} from "../src/mocks/MockStock.sol";
import {PriceGuard} from "../src/PriceGuard.sol";
import {SeriesRegistry} from "../src/SeriesRegistry.sol";
import {ArcumEngine} from "../src/ArcumEngine.sol";
import {WriterPool} from "../src/WriterPool.sol";
import {Reserve} from "../src/Reserve.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {AgentRouter} from "../src/AgentRouter.sol";
import {UniswapV3TwapReference, IUniswapV3FactoryLike} from "../src/UniswapV3TwapReference.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IOptionEngine} from "../src/interfaces/IOptionEngine.sol";
import {IReserve} from "../src/interfaces/IReserve.sol";
import {IFeeRouter} from "../src/interfaces/IFeeRouter.sol";
import {IPriceReference} from "../src/interfaces/IPriceReference.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DeployTestnet
/// @notice Official Robinhood Chain Testnet (Chain ID 46630) Deployment Script
contract DeployTestnet is Script {
    function run() external {
        uint256 deployerKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80) // Anvil default for simulation
        );

        vm.startBroadcast(deployerKey);
        address deployer = vm.addr(deployerKey);
        console.log("=== ARCUM PROTOCOL TESTNET DEPLOYMENT ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        // 1. Deploy MockUSDG (6 decimals)
        MockUSDG usdg = new MockUSDG();
        console.log("MockUSDG:", address(usdg));

        // 2. Deploy Mock Stocks (NVDA, TSLA, SPY, QQQ, AAPL)
        MockStock nvda = new MockStock("NVIDIA Stock Token", "NVDA");
        MockStock tsla = new MockStock("Tesla Stock Token", "TSLA");
        MockStock spy  = new MockStock("SPDR S&P 500 ETF", "SPY");
        MockStock qqq  = new MockStock("Invesco QQQ Trust", "QQQ");
        MockStock aapl = new MockStock("Apple Stock Token", "AAPL");
        console.log("Mock NVDA:", address(nvda));
        console.log("Mock TSLA:", address(tsla));
        console.log("Mock SPY :", address(spy));
        console.log("Mock QQQ :", address(qqq));
        console.log("Mock AAPL:", address(aapl));

        // 3. Deploy PriceGuard & set mock prices
        PriceGuard priceGuard = new PriceGuard();
        priceGuard.setMockPrice(address(nvda), 142500000000000000000); // $142.50
        priceGuard.setMockPrice(address(tsla), 248800000000000000000); // $248.80
        priceGuard.setMockPrice(address(spy),  585200000000000000000); // $585.20
        priceGuard.setMockPrice(address(qqq),  498400000000000000000); // $498.40
        priceGuard.setMockPrice(address(aapl), 226750000000000000000); // $226.75
        console.log("PriceGuard:", address(priceGuard));

        // 4. Deploy SeriesRegistry
        SeriesRegistry registry = new SeriesRegistry();
        registry.setAllowedStock(address(nvda), true);
        registry.setAllowedStock(address(tsla), true);
        registry.setAllowedStock(address(spy), true);
        registry.setAllowedStock(address(qqq), true);
        registry.setAllowedStock(address(aapl), true);
        console.log("SeriesRegistry:", address(registry));

        // 5. Deploy WriterPool implementation & Proxy (Testnet parameters: 30m queue, 5m lock)
        WriterPool poolImpl = new WriterPool(1800); // 30 minutes queue
        bytes memory poolInit = abi.encodeWithSelector(
            WriterPool.initialize.selector,
            deployer,
            usdg,
            IOptionEngine(address(0)),
            priceGuard
        );
        ERC1967Proxy poolProxy = new ERC1967Proxy(address(poolImpl), poolInit);
        WriterPool pool = WriterPool(address(poolProxy));
        pool.setPublicDeposits(true);
        console.log("WriterPool Proxy:", address(pool));

        // 6. Deploy ArcumEngine
        ArcumEngine engine = new ArcumEngine(
            address(registry),
            address(priceGuard),
            address(usdg),
            address(pool)
        );
        registry.setEngine(address(engine));
        console.log("ArcumEngine:", address(engine));

        // 7. Deploy TWAP Reference
        UniswapV3TwapReference twap = new UniswapV3TwapReference(IUniswapV3FactoryLike(address(pool)), address(usdg), 1800);
        console.log("UniswapV3TwapReference:", address(twap));

        // 8. Deploy Reserve & FeeRouter
        Reserve reserve = new Reserve(deployer, IERC20(address(usdg)), address(pool));
        FeeRouter feeRouter = new FeeRouter(address(usdg), address(pool), deployer, deployer, deployer);
        console.log("Reserve:", address(reserve));
        console.log("FeeRouter:", address(feeRouter));

        // Connect modules to WriterPool (3.2 fix)
        pool.setModules(IOptionEngine(address(engine)), IReserve(address(reserve)), IFeeRouter(address(feeRouter)), IPriceReference(address(0)));
        pool.setParams(300, 1000, 100, 100_000_000e6); // 5 min lock, 100M capacity

        // 9. Deploy AgentRouter
        AgentRouter agentRouter = new AgentRouter(address(engine));
        console.log("AgentRouter:", address(agentRouter));

        // 10. List launch series matching UI strike grid & Shield options
        registry.listSeries(address(nvda), true, 138 * 1e18, 86400); // NVDA Up $138 Daily
        registry.listSeries(address(nvda), true, 141 * 1e18, 86400); // NVDA Up $141 Daily
        registry.listSeries(address(nvda), true, 144 * 1e18, 86400); // NVDA Up $144 Daily
        registry.listSeries(address(nvda), true, 147 * 1e18, 86400); // NVDA Up $147 Daily
        registry.listSeries(address(nvda), true, 150 * 1e18, 86400); // NVDA Up $150 Daily
        registry.listSeries(address(nvda), false, 140 * 1e18, 604800); // NVDA Down $140 Weekly (Shield)
        registry.listSeries(address(tsla), true, 240 * 1e18, 86400); // TSLA Up $240 Daily
        registry.listSeries(address(tsla), false, 235 * 1e18, 604800); // TSLA Down $235 Weekly (Shield)
        registry.listSeries(address(spy), false, 570 * 1e18, 604800);  // SPY Down $570 Weekly (Shield)
        registry.listSeries(address(qqq), false, 485 * 1e18, 604800);  // QQQ Down $485 Weekly (Shield)
        registry.listSeries(address(aapl), false, 220 * 1e18, 604800); // AAPL Down $220 Weekly (Shield)

        // 11. Initial Pool Liquidity Underwrite (via deposit to preserve exact 1:1 NAV per share - 3.4 fix)
        usdg.mint(deployer, 5_000_000 * 1e6);
        usdg.approve(address(pool), 5_000_000 * 1e6);
        pool.deposit(5_000_000 * 1e6, deployer);

        vm.stopBroadcast();

        // 12. Serialize & Output to deployments/46630.json
        string memory k = "deploy";
        vm.serializeAddress(k, "usdg", address(usdg));
        vm.serializeAddress(k, "engineProxy", address(engine));
        vm.serializeAddress(k, "writerPoolProxy", address(pool));
        vm.serializeAddress(k, "writerPoolImpl", address(poolImpl));
        vm.serializeAddress(k, "agentRouter", address(agentRouter));
        vm.serializeAddress(k, "twapReference", address(twap));
        vm.serializeAddress(k, "reserve", address(reserve));
        vm.serializeAddress(k, "feeRouter", address(feeRouter));
        vm.serializeAddress(k, "priceGuard", address(priceGuard));
        vm.serializeAddress(k, "seriesRegistry", address(registry));
        vm.serializeAddress(k, "nvda", address(nvda));
        vm.serializeAddress(k, "tsla", address(tsla));
        vm.serializeAddress(k, "spy", address(spy));
        vm.serializeAddress(k, "qqq", address(qqq));
        vm.serializeAddress(k, "aapl", address(aapl));
        string memory outJson = vm.serializeUint(k, "chainId", 46630);
        if (vm.isContext(VmSafe.ForgeContext.ScriptBroadcast) && block.chainid == 46630) {
            vm.writeJson(outJson, "../deployments/46630.json");
            console.log("=== ARCUM TESTNET DEPLOY SCRIPT COMPLETED CLEANLY ===");
            console.log("Updated ../deployments/46630.json with deployed contract addresses.");
        }
    }
}
