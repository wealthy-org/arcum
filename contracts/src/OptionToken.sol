// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title OptionToken
/// @notice Dedicated ERC-20 clone minted and burned exclusively by the Arcum Engine.
contract OptionToken is ERC20 {
    address public immutable engine;
    bytes32 public immutable seriesId;

    error OnlyEngine();

    modifier onlyEngine() {
        if (msg.sender != engine) revert OnlyEngine();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        bytes32 seriesId_,
        address engine_
    ) ERC20(name_, symbol_) {
        engine = engine_;
        seriesId = seriesId_;
    }

    function mint(address to, uint256 amount) external onlyEngine {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyEngine {
        _burn(from, amount);
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        if (engine != address(0)) {
            // Accrue before balances change
            (bool success, ) = engine.call(abi.encodeWithSignature("accrue(bytes32)", seriesId));
            require(success || true, "Accrue hook");
        }
        super._update(from, to, value);
    }
}
