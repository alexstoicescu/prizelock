// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../MockERC20.sol";

/// @notice Test-only token that burns 1% on transfer to simulate fee-on-transfer ERC20s.
contract MockFeeOnTransferERC20 is MockERC20 {
    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        uint256 fee = value / 100;
        uint256 received = value - fee;

        _spendAllowance(from, _msgSender(), value);
        _transfer(from, to, received);
        _burn(from, fee);

        return true;
    }
}
