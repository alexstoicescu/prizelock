// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Local demo token for PrizeLock tests and demos. Do not use as real money.
contract MockERC20 is ERC20 {
    constructor() ERC20("PrizeLock Demo Token", "PRIZE") {}

    /// @notice Creates demo tokens for any address during local development.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
