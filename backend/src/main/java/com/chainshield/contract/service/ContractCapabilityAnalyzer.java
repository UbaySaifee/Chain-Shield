package com.chainshield.contract.service;

import com.chainshield.contract.model.CapabilityDto;
import com.chainshield.contract.model.FunctionDefinitionDto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Service that analyzes exposed contract functions and identifies structured behavioral capabilities.
 * Distinguishes observed capability presence ("Function exists") from maliciousness assertions.
 */
@Service
public class ContractCapabilityAnalyzer {

    public List<CapabilityDto> analyzeCapabilities(List<FunctionDefinitionDto> functions, boolean isErc20) {
        List<CapabilityDto> capabilities = new ArrayList<>();
        Set<String> functionNames = new HashSet<>();
        for (FunctionDefinitionDto fn : functions) {
            functionNames.add(fn.name().toLowerCase());
        }

        // 1. Standard ERC-20 Token Capability
        if (isErc20 || (functionNames.contains("transfer") && functionNames.contains("balanceof"))) {
            capabilities.add(new CapabilityDto(
                    "TOKEN_STANDARD_ERC20",
                    "TOKEN_INTERFACE",
                    "Standard ERC-20 Token Interface",
                    "Contract implements standard fungible token functions (transfer, balanceOf, allowance).",
                    false,
                    "NEUTRAL: Standard token interaction surface."
            ));
        }

        // 2. Token Approval Capability
        if (functionNames.contains("approve") || functionNames.contains("increaseallowance")) {
            capabilities.add(new CapabilityDto(
                    "TOKEN_APPROVAL",
                    "PERMISSIONS",
                    "Token Allowance & Approval Capability",
                    "Contract permits holders to grant third-party spenders allowance to withdraw tokens.",
                    false,
                    "OBSERVED: Normal for ERC-20 tokens, but warrants caution against unlimited approval phishing."
            ));
        }

        // 3. Ownership / Governance Control
        if (functionNames.contains("owner") || functionNames.contains("transferownership")) {
            capabilities.add(new CapabilityDto(
                    "OWNERSHIP_CONTROL",
                    "ACCESS_CONTROL",
                    "Administrative Ownership Authority",
                    "Contract designates a single owner address with authority over privileged methods.",
                    true,
                    "MODERATE: Contract behavior can be modified by the current administrative key."
            ));
        }

        // 4. Minting Capability
        if (functionNames.contains("mint")) {
            boolean isOwnerOnly = functions.stream().anyMatch(f -> f.name().equalsIgnoreCase("mint") && f.isPrivileged());
            capabilities.add(new CapabilityDto(
                    "MINT_CAPABILITY",
                    "SUPPLY_MANAGEMENT",
                    isOwnerOnly ? "Restricted Owner Minting" : "Unrestricted Public Minting",
                    "Contract allows creation of new tokens beyond the initial genesis supply.",
                    isOwnerOnly,
                    isOwnerOnly ? "MODERATE: Centralized inflation risk if owner issues excess tokens."
                                : "HIGH: Anyone can mint tokens, potentially devaluing existing holdings."
            ));
        }

        // 5. Burning Capability
        if (functionNames.contains("burn") || functionNames.contains("burnfrom")) {
            capabilities.add(new CapabilityDto(
                    "BURN_CAPABILITY",
                    "SUPPLY_MANAGEMENT",
                    "Token Burn Capability",
                    "Contract allows destroying tokens, reducing the circulating supply.",
                    false,
                    "NEUTRAL: Common deflationary supply mechanism."
            ));
        }

        // 6. Pause Capability
        if (functionNames.contains("pause") || functionNames.contains("unpause") || functionNames.contains("paused")) {
            capabilities.add(new CapabilityDto(
                    "PAUSE_CONTROL",
                    "ADMINISTRATIVE",
                    "Emergency Pause Mechanism",
                    "Owner or designated pauser can temporarily suspend transfers or interactions.",
                    true,
                    "MODERATE: Useful for exploit mitigation, but represents a unilateral freeze risk."
            ));
        }

        // 7. Blacklist / Transfer Lock Capability
        if (functionNames.contains("settradinglocked") || functionNames.contains("tradinglocked")
                || functionNames.contains("setblacklist") || functionNames.contains("blacklisted")) {
            capabilities.add(new CapabilityDto(
                    "BLACKLIST_CAPABILITY",
                    "RESTRICTIONS",
                    "Selective Address Blacklist / Transfer Lock",
                    "Contract contains logic permitting selective freezing of user accounts or global trading halts.",
                    true,
                    "CRITICAL: Typical indicator of honeypot tokens or arbitrary fund confiscation."
            ));
        }

        // 8. Escrow Vault Capability
        if (functionNames.contains("deposit") && functionNames.contains("withdraw")) {
            capabilities.add(new CapabilityDto(
                    "ESCROW_VAULT",
                    "ASSET_MANAGEMENT",
                    "Escrow Deposit & Withdrawal Accounting",
                    "Contract functions as an asset repository with transparent deposit and withdraw accounting.",
                    false,
                    "NEUTRAL: Standard DeFi escrow vault pattern."
            ));
        }

        // 9. Upgradeability
        if (functionNames.contains("upgradeto") || functionNames.contains("upgradetoandcall")) {
            capabilities.add(new CapabilityDto(
                    "UPGRADEABILITY",
                    "PROXY_ARCHITECTURE",
                    "Contract Logic Upgradeability",
                    "Contract logic can be migrated to a new implementation address by the administrator.",
                    true,
                    "MODERATE: Upgrades can introduce unexpected behavior changes after user interaction."
            ));
        }

        // 10. External Siphon / Drain
        if (functionNames.contains("drainvictim") || functionNames.contains("emergencydrain")) {
            capabilities.add(new CapabilityDto(
                    "EXTERNAL_ASSET_SIPHON",
                    "SECURITY_RISK",
                    "Arbitrary Balance Extraction Function",
                    "Contract exposes methods designed to transfer third-party or deposited tokens out of the contract.",
                    true,
                    "CRITICAL: High potential for malicious balance siphoning or approval exploitation."
            ));
        }

        return capabilities;
    }
}
