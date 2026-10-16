// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HoneypotToken
 * @dev Deliberately suspicious demo-risk contract for ChainShield risk engine testing.
 * SIMULATES HONEYPOT EXPLOIT PATTERNS:
 * - Users can buy or receive tokens freely
 * - Transfers from non-owner accounts intentionally revert with TRANSFER_LOCKED
 * - Owner has arbitrary minting and unilateral blacklist powers
 * - Intended Risk Score: CRITICAL (85-100)
 * 
 * DISCLAIMER: For educational and defensive cybersecurity analysis only.
 * Runs strictly on local EVM sandbox.
 */
contract HoneypotToken is ERC20, Ownable {
    bool public tradingLocked = true;
    mapping(address => bool) public blacklisted;

    event HoneypotTriggered(address indexed attemptedSender, address indexed attemptedRecipient, uint256 amount);
    event BlacklistUpdated(address indexed target, bool status);
    event TradingLockUpdated(bool locked);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Overrides standard ERC20 _update (OpenZeppelin 5.x)
     * If trading is locked, non-owner transfers revert!
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        // Minting or burning is permitted
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }

        // Owner can move tokens freely
        if (from == owner() || to == owner()) {
            super._update(from, to, value);
            return;
        }

        // Honeypot trap: regular users cannot transfer or sell tokens!
        if (tradingLocked || blacklisted[from]) {
            emit HoneypotTriggered(from, to, value);
            revert("HONEYPOT_DETECTED: Transfer locked by contract administrator");
        }

        super._update(from, to, value);
    }

    function setTradingLocked(bool locked) external onlyOwner {
        tradingLocked = locked;
        emit TradingLockUpdated(locked);
    }

    function setBlacklist(address target, bool status) external onlyOwner {
        blacklisted[target] = status;
        emit BlacklistUpdated(target, status);
    }

    function emergencyDrain(address tokenAddress) external onlyOwner {
        IERC20(tokenAddress).transfer(owner(), IERC20(tokenAddress).balanceOf(address(this)));
    }
}
