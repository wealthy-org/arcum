// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IOptionEngine} from "./interfaces/IOptionEngine.sol";
import {ISeriesRegistry} from "./interfaces/ISeriesRegistry.sol";
import {IPriceGuard} from "./interfaces/IPriceGuard.sol";
import {OptionToken} from "./OptionToken.sol";
import {Series, Speed, SessionKind, PriceReading} from "./libs/OptionTypes.sol";
import {EverlastingMath} from "./libs/EverlastingMath.sol";
import {EverlastingGreeks} from "./libs/EverlastingGreeks.sol";
import {FixedMath} from "./libs/FixedMath.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ArcumEngine
/// @notice Core everlasting options trading engine for Arcum on Robinhood Chain.
contract ArcumEngine is IOptionEngine, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using FixedMath for uint256;

    uint256 constant WAD = 1e18;
    uint256 constant USDG_TO_WAD = 1e12; // 6 decimals to 18 decimals
    uint16 constant PROTOCOL_FEE_BPS = 3; // 3 bps base trade fee

    ISeriesRegistry public immutable REGISTRY;
    IPriceGuard public immutable PRICE_GUARD;
    IERC20 public immutable USDG;
    address public pool;

    bool public buysPaused;
    uint256 public nextTicketId = 1;

    struct QueuedSell {
        bytes32 seriesId;
        address seller;
        address recipient;
        uint128 tokens;
        uint64 queuedAt;
    }

    mapping(uint256 => QueuedSell) public queuedSells;
    mapping(bytes32 => bool) public seriesBuysPaused;

    constructor(
        address registry_,
        address priceGuard_,
        address usdg_,
        address pool_
    ) Ownable(msg.sender) {
        REGISTRY = ISeriesRegistry(registry_);
        PRICE_GUARD = IPriceGuard(priceGuard_);
        USDG = IERC20(usdg_);
        pool = pool_;
    }

    function setPool(address pool_) external onlyOwner {
        pool = pool_;
    }

    function setBuysPaused(bool globalPaused) external override onlyOwner {
        buysPaused = globalPaused;
        emit BuysPaused(true, bytes32(0), globalPaused);
    }

    function setSeriesBuysPaused(bytes32 id, bool paused) external override onlyOwner {
        seriesBuysPaused[id] = paused;
        emit BuysPaused(false, id, paused);
    }

    function quote(bytes32 id, uint256 units, bool isBuy) public view override returns (Quote memory q) {
        Series memory s = REGISTRY.seriesOf(id);
        PriceReading memory r = PRICE_GUARD.read(s.stock);

        q.session = r.session;
        q.sigmaBps = 5000; // 50% IV
        q.buyable = s.buyable && !buysPaused && !seriesBuysPaused[id] && !r.buysPaused;

        uint256 markPriceWad = EverlastingMath.price(r.s, s.strike, q.sigmaBps, s.tauSeconds, s.isCall);
        q.vMarkWad = markPriceWad;

        // Base fee: 3 bps
        uint256 rawCostWad = markPriceWad.wadMul(units);
        uint256 feeWad = (rawCostWad * PROTOCOL_FEE_BPS) / 10000;
        q.spreadBps = s.speed == Speed.DAILY ? 15 : 25;
        uint256 spreadWad = (rawCostWad * q.spreadBps) / 10000;

        uint256 totalWad = isBuy ? (rawCostWad + feeWad + spreadWad) : (rawCostWad > (feeWad + spreadWad) ? rawCostWad - (feeWad + spreadWad) : 0);
        q.usdg = totalWad / USDG_TO_WAD;
        q.feeUsdg = feeWad / USDG_TO_WAD;

        uint256 timeValueWad = markPriceWad > EverlastingMath.payoff(r.s, s.strike, s.isCall)
            ? markPriceWad - EverlastingMath.payoff(r.s, s.strike, s.isCall)
            : 0;
        q.dailyCostUsdg = ((timeValueWad / s.tauSeconds) * 86400 * units) / USDG_TO_WAD;
        q.breakevenWad = s.isCall ? s.strike + (totalWad.wadDiv(units)) : (s.strike > totalWad.wadDiv(units) ? s.strike - totalWad.wadDiv(units) : 0);
    }

    function buy(
        bytes32 id,
        uint128 units,
        uint128 maxCostUsdg,
        uint64 deadline,
        address recipient
    ) external override nonReentrant returns (uint256 costUsdg, uint256 tokensMinted) {
        return _buyInternal(id, units, maxCostUsdg, deadline, msg.sender, recipient);
    }

    function _buyInternal(
        bytes32 id,
        uint128 units,
        uint128 maxCostUsdg,
        uint64 deadline,
        address payer,
        address recipient
    ) internal returns (uint256 costUsdg, uint256 tokensMinted) {
        if (block.timestamp > deadline) revert Expired();
        if (units == 0) revert BelowMinimum();

        Quote memory q = quote(id, units, true);
        if (!q.buyable) revert SeriesNotBuyable(id);
        if (q.session == SessionKind.HALTED || q.session == SessionKind.CLOSED) revert SessionBlocksBuys(q.session);
        if (q.usdg > maxCostUsdg) revert Slippage(q.usdg, maxCostUsdg);

        costUsdg = q.usdg;
        tokensMinted = uint256(units);

        // Pull USDG to writer pool
        USDG.safeTransferFrom(payer, pool, costUsdg);

        // Mint OptionToken
        Series memory s = REGISTRY.seriesOf(id);
        OptionToken(s.token).mint(recipient, tokensMinted);

        emit Bought(id, payer, recipient, units, tokensMinted, costUsdg, q.vMarkWad, q.sigmaBps, q.session);
    }

    function sell(
        bytes32 id,
        uint128 tokens,
        uint128 minProceedsUsdg,
        uint64 deadline,
        address recipient
    ) external override nonReentrant returns (uint256 proceedsUsdg) {
        if (block.timestamp > deadline) revert Expired();
        if (tokens == 0) revert BelowMinimum();

        Series memory s = REGISTRY.seriesOf(id);
        PriceReading memory r = PRICE_GUARD.readLite(s.stock);

        // Burn OptionToken from seller
        OptionToken(s.token).burn(msg.sender, tokens);

        // Check if market is halted -> Queue sell
        if (r.session == SessionKind.HALTED) {
            uint256 ticket = nextTicketId++;
            queuedSells[ticket] = QueuedSell({
                seriesId: id,
                seller: msg.sender,
                recipient: recipient,
                tokens: tokens,
                queuedAt: uint64(block.timestamp)
            });
            emit SellQueued(ticket, id, msg.sender, recipient, tokens, uint64(block.timestamp));
            return 0;
        }

        // Effective units = tokens * norm
        uint256 effectiveUnits = uint256(tokens).wadMul(s.norm);
        Quote memory q = quote(id, effectiveUnits, false);
        if (q.usdg < minProceedsUsdg) revert Slippage(q.usdg, minProceedsUsdg);

        proceedsUsdg = q.usdg;

        // Pay USDG to recipient
        USDG.safeTransferFrom(pool, recipient, proceedsUsdg);

        emit Sold(id, msg.sender, recipient, effectiveUnits, tokens, proceedsUsdg, q.vMarkWad, q.sigmaBps, q.session);
    }

    function shield(
        address stockToken,
        uint128 tokenUnits,
        uint16 strikePctBelowBps,
        uint128 maxCostUsdg,
        uint64 deadline
    ) external override returns (bytes32 id, uint256 costUsdg) {
        // Find optimal weekly put strike at or below spot * (1 - pctBelow)
        PriceReading memory r = PRICE_GUARD.read(stockToken);
        uint256 targetStrike = r.s.wadMul(WAD - (uint256(strikePctBelowBps) * WAD / 10000));
        
        id = REGISTRY.idOf(stockToken, false, uint128(targetStrike), 604800); // Weekly Put
        (costUsdg,) = _buyInternal(id, tokenUnits, maxCostUsdg, deadline, msg.sender, msg.sender);
        emit ShieldBought(msg.sender, stockToken, id, tokenUnits, costUsdg);
    }

    function accrue(bytes32 id) external override {
        // Re-marks series norm
    }

    function accrueMany(bytes32[] calldata ids) external override {}

    function vMark(bytes32 id) external view override returns (uint256 vWad, uint256 payoffWad, uint64 sigmaBps, SessionKind session) {
        Quote memory q = quote(id, WAD, true);
        return (q.vMarkWad, 0, q.sigmaBps, q.session);
    }

    function totalLiability() public view override returns (uint256 liabilityWad) {
        uint256 count = REGISTRY.seriesCount();
        uint256 total = 0;
        for (uint256 i = 0; i < count; i++) {
            bytes32 sId = REGISTRY.seriesIdAt(i);
            Series memory s = REGISTRY.seriesOf(sId);
            if (s.token != address(0)) {
                uint256 supply = OptionToken(s.token).totalSupply();
                if (supply > 0) {
                    Quote memory q = quote(sId, supply, false);
                    total += q.vMarkWad.wadMul(supply);
                }
            }
        }
        return total;
    }

    function netGreeks(address stock) external view override returns (int256 deltaWad, int256 gammaWad, int256 vegaWad) {
        uint256 count = REGISTRY.seriesCount();
        PriceReading memory r = PRICE_GUARD.readLite(stock);
        int256 netDelta = 0;
        int256 netGamma = 0;
        for (uint256 i = 0; i < count; i++) {
            bytes32 sId = REGISTRY.seriesIdAt(i);
            Series memory s = REGISTRY.seriesOf(sId);
            if (s.stock == stock && s.token != address(0)) {
                uint256 supply = OptionToken(s.token).totalSupply();
                if (supply > 0) {
                    int256 d = EverlastingGreeks.delta(r.s, s.strike, 5000, s.tauSeconds, s.isCall);
                    netDelta += (d * int256(supply)) / int256(WAD);
                    uint256 g = EverlastingGreeks.gamma(r.s, s.strike, 5000, s.tauSeconds);
                    netGamma += (int256(g) * int256(supply)) / int256(WAD);
                }
            }
        }
        return (netDelta, netGamma, 0);
    }

    function cancelQueued(uint256 ticket) external override {
        QueuedSell memory q = queuedSells[ticket];
        if (msg.sender != q.seller) revert Expired();
        delete queuedSells[ticket];
        Series memory s = REGISTRY.seriesOf(q.seriesId);
        OptionToken(s.token).mint(q.recipient, q.tokens);
        emit QueuedSellCancelled(ticket);
    }

    function fillQueued(uint256 ticket) external override returns (uint256 usdgOut) {
        QueuedSell memory q = queuedSells[ticket];
        delete queuedSells[ticket];
        Series memory s = REGISTRY.seriesOf(q.seriesId);
        uint256 effectiveUnits = uint256(q.tokens).wadMul(s.norm);
        Quote memory quoteData = quote(q.seriesId, effectiveUnits, false);
        usdgOut = quoteData.usdg;
        USDG.safeTransferFrom(pool, q.recipient, usdgOut);
        emit QueuedSellFilled(ticket, msg.sender, usdgOut);
    }

    function bookValue() external view override returns (uint256 bookValueWad) {
        return totalLiability();
    }

    function capBps() external pure override returns (uint16 totalCapNavBps, uint16 nameCapNavBps) {
        return (3500, 800); // 35% total cap, 8% name cap
    }

    function usdg() external view returns (IERC20) {
        return USDG;
    }

    function registry() external view returns (ISeriesRegistry) {
        return REGISTRY;
    }

    function priceGuard() external view returns (IPriceGuard) {
        return PRICE_GUARD;
    }
}
