// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SafeVault
 * @dev Deliberately safe escrow vault contract for ChainShield testing.
 * Demonstrates clean architecture:
 * - Proper ReentrancyGuard usage
 * - No arbitrary transfer locks
 * - Transparent deposits and withdrawals
 * - Expected Risk Score: LOW (0-15)
 */
contract SafeVault is ReentrancyGuard, Ownable {
    IERC20 public immutable token;
    mapping(address => uint256) private _balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(address tokenAddress) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Invalid token address");
        token = IERC20(tokenAddress);
    }

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Deposit amount must be greater than zero");
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        _balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Withdrawal amount must be greater than zero");
        require(_balances[msg.sender] >= amount, "Insufficient deposited balance");

        _balances[msg.sender] -= amount;
        bool success = token.transfer(msg.sender, amount);
        require(success, "Token transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    function balanceOf(address user) external view returns (uint256) {
        return _balances[user];
    }
}
