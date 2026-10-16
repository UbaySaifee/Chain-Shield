package com.chainshield.service.risk;

import com.chainshield.domain.EvaluationResult;
import com.chainshield.domain.RiskCategory;
import com.chainshield.domain.Severity;
import com.chainshield.domain.TargetType;
import com.chainshield.domain.TriggeredIndicator;
import com.chainshield.entity.KnownThreat;
import com.chainshield.provider.model.ContractData;
import com.chainshield.provider.model.TransactionData;
import com.chainshield.provider.model.WalletData;
import com.chainshield.repository.KnownThreatRepository;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Production-quality deterministic risk engine.
 * Computes transparent, explainable risk scores without black-box opacity.
 *
 * Formula:
 * RawScore = sum(baseWeight_i * severityMultiplier_i)
 * RiskScore = min(100, max(0, round(RawScore)))
 *
 * DISCLAIMER: Prototype risk assessment tool. Never guarantees 100% malicious contract detection.
 */
@Service
public class DeterministicRiskEngine {

    private final KnownThreatRepository knownThreatRepository;

    public DeterministicRiskEngine(KnownThreatRepository knownThreatRepository) {
        this.knownThreatRepository = knownThreatRepository;
    }

    public EvaluationResult evaluateWallet(WalletData wallet) {
        List<TriggeredIndicator> indicators = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();
        Map<String, Object> metadata = new HashMap<>();

        metadata.put("accountAgeDays", wallet.accountAgeDays());
        metadata.put("transactionCount", wallet.transactionCount());
        metadata.put("counterpartyCount", wallet.counterpartyCount());
        metadata.put("dataSource", wallet.dataSource());

        // Rule 1: Known Threat Check
        Optional<KnownThreat> threatMatch = knownThreatRepository.findByAddressIgnoreCase(wallet.address());
        if (threatMatch.isPresent()) {
            KnownThreat threat = threatMatch.get();
            indicators.add(new TriggeredIndicator(
                    "IND-W01",
                    "WALLET_BEHAVIOR",
                    "Known Threat Match (" + threat.getThreatType() + ")",
                    Severity.CRITICAL,
                    45,
                    (int) Math.round(45 * Severity.CRITICAL.getMultiplier()),
                    "Address matches a record on the local threat intelligence dataset: " + threat.getDescription(),
                    "Cataloged as: " + threat.getThreatType() + " with confidence " + threat.getConfidenceLevel() + "%."
            ));
            recommendations.add("DO NOT send or accept assets from this address; address is cataloged as high risk.");
        }

        // Rule 2: Fresh High-Velocity Account
        if (wallet.accountAgeDays() < 7 && wallet.transactionCount() > 15) {
            indicators.add(new TriggeredIndicator(
                    "IND-W02",
                    "WALLET_BEHAVIOR",
                    "Fresh High-Velocity Account",
                    Severity.MEDIUM,
                    20,
                    (int) Math.round(20 * Severity.MEDIUM.getMultiplier()),
                    "Account is newly created (< 7 days old) but exhibits abnormally high transaction frequency.",
                    "Account age: " + wallet.accountAgeDays() + " days; transaction count: " + wallet.transactionCount()
            ));
            recommendations.add("Exercise caution when interacting with newly initialized accounts.");
        }

        // Rule 3: Flagged Counterparty Interaction
        if (wallet.recentInteractions() != null) {
            for (String counterparty : wallet.recentInteractions()) {
                if (knownThreatRepository.existsByAddressIgnoreCase(counterparty)) {
                    indicators.add(new TriggeredIndicator(
                            "IND-W03",
                            "WALLET_BEHAVIOR",
                            "Interaction with Flagged Counterparty",
                            Severity.HIGH,
                            25,
                            (int) Math.round(25 * Severity.HIGH.getMultiplier()),
                            "Address has transacted with flagged counterparty: " + counterparty,
                            "Linked counterparty matches local threat list: " + counterparty
                    ));
                    recommendations.add("Verify the origin of funds associated with this wallet.");
                    break;
                }
            }
        }

        return compileResult(TargetType.WALLET, indicators, recommendations, metadata);
    }

    public EvaluationResult evaluateContract(ContractData contract) {
        List<TriggeredIndicator> indicators = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();
        Map<String, Object> metadata = new HashMap<>();

        metadata.put("contractName", contract.name());
        metadata.put("bytecodeSize", contract.bytecodeSize());
        metadata.put("isVerified", contract.isVerified());
        metadata.put("dataSource", contract.dataSource());

        // Rule 1: Known Threat Check
        Optional<KnownThreat> threatMatch = knownThreatRepository.findByAddressIgnoreCase(contract.address());
        if (threatMatch.isPresent()) {
            KnownThreat threat = threatMatch.get();
            indicators.add(new TriggeredIndicator(
                    "IND-W01",
                    "KNOWN_THREAT",
                    "Cataloged Malicious Contract",
                    Severity.CRITICAL,
                    45,
                    (int) Math.round(45 * Severity.CRITICAL.getMultiplier()),
                    "Smart contract is cataloged on the threat registry: " + threat.getDescription(),
                    "Type: " + threat.getThreatType()
            ));
        }

        // Rule 2: Honeypot Sell Restriction
        if (contract.isTradingLocked()) {
            indicators.add(new TriggeredIndicator(
                    "IND-C03",
                    "CONTRACT_PERMISSIONS",
                    "Honeypot Sell Restriction",
                    Severity.CRITICAL,
                    50,
                    (int) Math.round(50 * Severity.CRITICAL.getMultiplier()),
                    "Contract contains transfer locks prohibiting non-owners from transferring or selling tokens.",
                    "Simulation test call to transfer() detects active trading lock."
            ));
            recommendations.add("CRITICAL: Do NOT buy or swap this token. Tokens acquired cannot be liquidated.");
        }

        // Rule 3: Centralized Blacklist or Mint Authority
        if (contract.hasBlacklist() || contract.hasOwnerOnlyMint()) {
            indicators.add(new TriggeredIndicator(
                    "IND-C02",
                    "CONTRACT_PERMISSIONS",
                    "Centralized Owner Control",
                    Severity.HIGH,
                    25,
                    (int) Math.round(25 * Severity.HIGH.getMultiplier()),
                    "Contract owner possesses unilateral authority to blacklist users or arbitrarily mint tokens.",
                    "Privileged capabilities detected in contract ABI/bytecode."
            ));
            recommendations.add("Check whether contract ownership is renounced or governed by a multisig timelock.");
        }

        // Rule 4: Unverified Source Bytecode
        if (!contract.isVerified() && contract.isBytecodePresent()) {
            indicators.add(new TriggeredIndicator(
                    "IND-C01",
                    "CONTRACT_PERMISSIONS",
                    "Unverified Source Bytecode",
                    Severity.MEDIUM,
                    15,
                    (int) Math.round(15 * Severity.MEDIUM.getMultiplier()),
                    "No publicly published source code available. Assessment relies on bytecode disassembly.",
                    "Bytecode size: " + contract.bytecodeSize() + " bytes; explorer verification: NONE."
            ));
            recommendations.add("Request verified source code on a public block explorer before interacting.");
        }

        // Rule 5: Dangerous Delegatecall
        if (contract.hasDelegateCall()) {
            indicators.add(new TriggeredIndicator(
                    "IND-C04",
                    "CONTRACT_PERMISSIONS",
                    "Unrestricted Delegatecall",
                    Severity.HIGH,
                    35,
                    (int) Math.round(35 * Severity.HIGH.getMultiplier()),
                    "Bytecode invokes DELEGATECALL to dynamic or user-supplied execution targets.",
                    "Opcode 0xF4 detected in execution paths."
            ));
        }

        // Rule 6: Self-Destruct
        if (contract.hasSelfDestruct()) {
            indicators.add(new TriggeredIndicator(
                    "IND-C05",
                    "CONTRACT_PERMISSIONS",
                    "Self-Destruct Capable",
                    Severity.HIGH,
                    30,
                    (int) Math.round(30 * Severity.HIGH.getMultiplier()),
                    "Contract contains SELFDESTRUCT opcode, allowing balance extraction and code erasure.",
                    "Opcode 0xFF detected."
            ));
        }

        if (indicators.isEmpty()) {
            recommendations.add("Standard interaction appears low risk. Practice routine Web3 hygiene.");
        }

        return compileResult(TargetType.CONTRACT, indicators, recommendations, metadata);
    }

    public EvaluationResult evaluateContractDetails(
            String address,
            String name,
            boolean isContract,
            int bytecodeSize,
            boolean isVerified,
            boolean isTradingLocked,
            boolean hasBlacklist,
            boolean hasOwnerOnlyMint,
            boolean hasDangerousDrain,
            boolean hasDelegateCall,
            boolean hasSelfDestruct,
            boolean isProxy,
            boolean hasOwner,
            boolean hasPause,
            boolean isThreatMatch,
            String threatDescription
    ) {
        List<TriggeredIndicator> indicators = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();
        Map<String, Object> metadata = new HashMap<>();

        metadata.put("contractName", name);
        metadata.put("bytecodeSize", bytecodeSize);
        metadata.put("isVerified", isVerified);
        metadata.put("isContract", isContract);

        if (!isContract) {
            recommendations.add("Address is an individual wallet account (EOA). No smart contract risk applies.");
            return compileResult(TargetType.CONTRACT, indicators, recommendations, metadata);
        }

        // Rule 1: Known Threat Check
        if (isThreatMatch) {
            indicators.add(new TriggeredIndicator(
                    "IND-W01",
                    "KNOWN_THREAT",
                    "Cataloged Threat Entity",
                    Severity.CRITICAL,
                    45,
                    (int) Math.round(45 * Severity.CRITICAL.getMultiplier()),
                    "Smart contract is cataloged on the threat registry: " + (threatDescription != null ? threatDescription : "Known malicious target"),
                    "Address: " + address
            ));
            recommendations.add("CRITICAL: Do NOT interact with this contract; it matches cataloged threat intelligence.");
        }

        // Rule 2: Honeypot Sell Restriction
        if (isTradingLocked) {
            indicators.add(new TriggeredIndicator(
                    "IND-C03",
                    "CONTRACT_PERMISSIONS",
                    "Honeypot Sell Restriction",
                    Severity.CRITICAL,
                    50,
                    (int) Math.round(50 * Severity.CRITICAL.getMultiplier()),
                    "Contract contains transfer locks prohibiting non-owners from transferring or selling tokens.",
                    "Active trading lock or transfer revert pattern detected."
            ));
            recommendations.add("CRITICAL: Do NOT buy or swap this token. Tokens acquired cannot be liquidated.");
        }

        // Rule 3: Centralized Blacklist or Mint Authority
        if (hasBlacklist || hasOwnerOnlyMint) {
            indicators.add(new TriggeredIndicator(
                    "IND-C02",
                    "CONTRACT_PERMISSIONS",
                    "Centralized Mint/Burn/Blacklist Control",
                    Severity.HIGH,
                    25,
                    (int) Math.round(25 * Severity.HIGH.getMultiplier()),
                    "Contract owner possesses unilateral authority to blacklist users or arbitrarily mint tokens.",
                    "Privileged administrative methods detected in contract ABI."
            ));
            recommendations.add("Check whether contract ownership is renounced or governed by a multisig timelock.");
        }

        // Rule 4: Arbitrary External Asset Siphon
        if (hasDangerousDrain) {
            indicators.add(new TriggeredIndicator(
                    "IND-C08",
                    "SECURITY_RISK",
                    "Arbitrary Balance Extraction Function",
                    Severity.CRITICAL,
                    40,
                    (int) Math.round(40 * Severity.CRITICAL.getMultiplier()),
                    "Contract contains unconstrained methods designed to transfer victim tokens to a treasury.",
                    "Observed exploit function: drainVictim / emergencyDrain."
            ));
            recommendations.add("CRITICAL: Do NOT grant token approvals to this contract.");
        }

        // Rule 5: Unverified Source Bytecode
        if (!isVerified) {
            indicators.add(new TriggeredIndicator(
                    "IND-C01",
                    "CONTRACT_PERMISSIONS",
                    "Unverified Source Bytecode",
                    Severity.MEDIUM,
                    15,
                    (int) Math.round(15 * Severity.MEDIUM.getMultiplier()),
                    "No publicly published source code available. Assessment relies on bytecode disassembly.",
                    "Bytecode size: " + bytecodeSize + " bytes; explorer verification: NONE."
            ));
            recommendations.add("Request verified source code on a block explorer before interacting.");
        }

        // Rule 6: Dangerous Delegatecall
        if (hasDelegateCall) {
            indicators.add(new TriggeredIndicator(
                    "IND-C04",
                    "CONTRACT_PERMISSIONS",
                    "Unrestricted Delegatecall",
                    Severity.HIGH,
                    35,
                    (int) Math.round(35 * Severity.HIGH.getMultiplier()),
                    "Bytecode invokes DELEGATECALL to dynamic or user-supplied execution targets.",
                    "Opcode 0xF4 detected in execution paths."
            ));
        }

        // Rule 7: Self-Destruct
        if (hasSelfDestruct) {
            indicators.add(new TriggeredIndicator(
                    "IND-C05",
                    "CONTRACT_PERMISSIONS",
                    "Self-Destruct Capable",
                    Severity.HIGH,
                    30,
                    (int) Math.round(30 * Severity.HIGH.getMultiplier()),
                    "Contract contains SELFDESTRUCT opcode, allowing balance extraction and code erasure.",
                    "Opcode 0xFF detected."
            ));
        }

        // Rule 8: Upgradeable Proxy Pattern
        if (isProxy) {
            indicators.add(new TriggeredIndicator(
                    "IND-C06",
                    "PROXY_ARCHITECTURE",
                    "Upgradeable Proxy Pattern Detected",
                    Severity.MEDIUM,
                    15,
                    (int) Math.round(15 * Severity.MEDIUM.getMultiplier()),
                    "Contract routes execution through a proxy pattern or mutable implementation address.",
                    "EIP-1967 storage slot or delegatecall forwarder detected."
            ));
            recommendations.add("Verify the proxy implementation address and administrative timelock.");
        }

        // Rule 9: Pause Capability
        if (hasPause) {
            indicators.add(new TriggeredIndicator(
                    "IND-C10",
                    "ADMINISTRATIVE",
                    "Owner-Controlled Pause Capability",
                    Severity.MEDIUM,
                    15,
                    (int) Math.round(15 * Severity.MEDIUM.getMultiplier()),
                    "Owner can pause operations, halting transfers or contract interaction.",
                    "Method pause/unpause detected."
            ));
        }

        // Rule 10: Administrative Ownership Authority
        if (hasOwner && !hasBlacklist && !hasDangerousDrain && !isTradingLocked) {
            indicators.add(new TriggeredIndicator(
                    "IND-C07",
                    "ACCESS_CONTROL",
                    "Administrative Ownership Authority",
                    Severity.LOW,
                    10,
                    (int) Math.round(10 * Severity.LOW.getMultiplier()),
                    "Contract designates a single administrator or owner address.",
                    "OpenZeppelin Ownable pattern observed."
            ));
        }

        if (indicators.isEmpty()) {
            recommendations.add("Standard interaction appears low risk on local testbed. Practice routine Web3 vigilance.");
        }

        return compileResult(TargetType.CONTRACT, indicators, recommendations, metadata);
    }

    public EvaluationResult evaluateTransaction(TransactionData tx) {
        List<TriggeredIndicator> indicators = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();
        Map<String, Object> metadata = new HashMap<>();

        metadata.put("methodSignature", tx.methodSignature());
        metadata.put("isApproval", tx.isApproval());
        metadata.put("isUnlimitedApproval", tx.isUnlimitedApproval());
        metadata.put("spenderAddress", tx.spenderAddress());
        metadata.put("dataSource", tx.dataSource());

        // Rule 1: Target Contract or Spender Threat Match
        if (knownThreatRepository.existsByAddressIgnoreCase(tx.to())) {
            indicators.add(new TriggeredIndicator(
                    "IND-T03",
                    "TRANSACTION_SIMULATION",
                    "Transaction Targets Flagged Entity",
                    Severity.CRITICAL,
                    45,
                    (int) Math.round(45 * Severity.CRITICAL.getMultiplier()),
                    "Transaction destination address is cataloged on the local threat intelligence registry.",
                    "Recipient address: " + tx.to()
            ));
            recommendations.add("REJECT TRANSACTION: Recipient address is flagged as a threat.");
        }

        // Rule 2: Unlimited Approval Grant
        if (tx.isApproval() && tx.isUnlimitedApproval()) {
            indicators.add(new TriggeredIndicator(
                    "IND-T01",
                    "TRANSACTION_SIMULATION",
                    "Unlimited Token Allowance Grant",
                    Severity.HIGH,
                    35,
                    (int) Math.round(35 * Severity.HIGH.getMultiplier()),
                    "Transaction grants external spender unconstrained approval (Max Uint256) over token balance.",
                    "Method: " + tx.methodSignature() + " with unlimited allowance amount."
            ));
            recommendations.add("Reduce allowance to the exact required transaction amount instead of MAX_UINT256.");
        }

        // Rule 3: Spender is Flagged
        if (tx.spenderAddress() != null && knownThreatRepository.existsByAddressIgnoreCase(tx.spenderAddress())) {
            indicators.add(new TriggeredIndicator(
                    "IND-W01",
                    "TRANSACTION_SIMULATION",
                    "Spender is Flagged Threat",
                    Severity.CRITICAL,
                    45,
                    (int) Math.round(45 * Severity.CRITICAL.getMultiplier()),
                    "The spender address being granted approval is cataloged on the threat registry.",
                    "Spender address: " + tx.spenderAddress()
            ));
            recommendations.add("DO NOT APPROVE: Spender is cataloged as a malicious drainer.");
        }

        if (indicators.isEmpty()) {
            recommendations.add("Transaction calldata appears standard. Proceed with normal verification.");
        }

        return compileResult(TargetType.TRANSACTION, indicators, recommendations, metadata);
    }

    public EvaluationResult evaluateSimulatedTransaction(
            String from,
            String to,
            com.chainshield.blockchain.decoder.CalldataDecoder.DecodedCall decodedCall,
            boolean isReverted,
            String revertReason,
            String toContractType,
            boolean isThreatMatch,
            boolean isSpenderThreatMatch
    ) {
        List<TriggeredIndicator> indicators = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();
        Map<String, Object> metadata = new HashMap<>();

        metadata.put("methodSignature", decodedCall.functionSignature());
        metadata.put("isApproval", decodedCall.isApproval());
        metadata.put("isUnlimitedApproval", decodedCall.isUnlimitedApproval());
        metadata.put("spenderAddress", decodedCall.spenderAddress());
        metadata.put("isReverted", isReverted);
        if (revertReason != null) {
            metadata.put("revertReason", revertReason);
        }

        // 1. Check for Simulation Revert
        if (isReverted) {
            boolean isHoneypotRevert = revertReason != null && revertReason.toUpperCase().contains("HONEYPOT");
            if (isHoneypotRevert || "MALICIOUS_HONEYPOT".equals(toContractType)) {
                indicators.add(new TriggeredIndicator(
                        "IND-C03",
                        "HONEYPOT_BEHAVIOR",
                        "Honeypot Sell/Transfer Lock Triggered",
                        Severity.CRITICAL,
                        50,
                        (int) Math.round(50 * Severity.CRITICAL.getMultiplier()),
                        "Simulation dry-run explicitly triggered a transfer block. Non-owners are prevented from transferring tokens.",
                        revertReason != null ? revertReason : "Honeypot transfer pause detected"
                ));
                recommendations.add("CRITICAL DANGER: Honeypot lock detected! Any tokens acquired cannot be sold or transferred.");
            } else {
                indicators.add(new TriggeredIndicator(
                        "IND-T03",
                        "TRANSACTION_SIMULATION",
                        "Simulation Revert / Execution Failure",
                        Severity.HIGH,
                        40,
                        (int) Math.round(40 * Severity.HIGH.getMultiplier()),
                        "Transaction execution reverted during pre-execution simulation on the local EVM.",
                        revertReason != null ? revertReason : "eth_call execution reverted"
                ));
                recommendations.add("Transaction is projected to revert on-chain. Do not submit to avoid losing gas fees.");
            }
        }

        // 2. Check for Unlimited Approval
        if (decodedCall.isUnlimitedApproval()) {
            indicators.add(new TriggeredIndicator(
                    "IND-T01",
                    "DANGEROUS_PERMISSIONS",
                    "Unlimited Token Allowance Grant",
                    Severity.HIGH,
                    35,
                    (int) Math.round(35 * Severity.HIGH.getMultiplier()),
                    "Transaction grants external spender unconstrained approval (Max Uint256) over token balance.",
                    "Spender " + decodedCall.spenderAddress() + " requested MAX_UINT256"
            ));
            recommendations.add("Reduce allowance to the exact required transaction amount instead of MAX_UINT256.");
        }

        // 3. Check for Spender Threat / Drainer Contract
        if (isSpenderThreatMatch || "MALICIOUS_APPROVAL_SPENDER".equals(toContractType)) {
            indicators.add(new TriggeredIndicator(
                    "IND-T02",
                    "DANGEROUS_PERMISSIONS",
                    "Approval Granted to Suspected Drainer Contract",
                    Severity.CRITICAL,
                    45,
                    (int) Math.round(45 * Severity.CRITICAL.getMultiplier()),
                    "The spender address being granted allowance matches a testbed drainer contract designed to siphon tokens.",
                    "Spender: " + decodedCall.spenderAddress()
            ));
            recommendations.add("REJECT APPROVAL: Target contract exhibits asset-draining exploit patterns.");
        }

        // 4. Target Address is Known Threat
        if (isThreatMatch) {
            indicators.add(new TriggeredIndicator(
                    "IND-W01",
                    "KNOWN_THREAT",
                    "Transaction Destination Matches Known Threat",
                    Severity.CRITICAL,
                    45,
                    (int) Math.round(45 * Severity.CRITICAL.getMultiplier()),
                    "The destination contract or wallet is cataloged on the threat intelligence registry.",
                    "Destination address: " + to
            ));
            recommendations.add("REJECT TRANSACTION: Destination address is flagged on the threat list.");
        }

        if (indicators.isEmpty()) {
            recommendations.add("Simulation succeeded on the local EVM with zero high-risk indicators.");
            recommendations.add("Proceed with standard Web3 operational vigilance.");
        }

        return compileResult(TargetType.TRANSACTION, indicators, recommendations, metadata);
    }

    private EvaluationResult compileResult(
            TargetType type,
            List<TriggeredIndicator> indicators,
            List<String> recommendations,
            Map<String, Object> metadata
    ) {
        double rawScore = 0.0;
        for (TriggeredIndicator ind : indicators) {
            rawScore += ind.appliedWeight();
        }

        int finalScore = (int) Math.min(100, Math.max(0, Math.round(rawScore)));
        RiskCategory category = RiskCategory.fromScore(finalScore);

        String summary = generateSummary(type, category, finalScore, indicators);

        return new EvaluationResult(
                finalScore,
                category,
                summary,
                indicators,
                recommendations,
                metadata
        );
    }

    private String generateSummary(TargetType type, RiskCategory category, int score, List<TriggeredIndicator> indicators) {
        if (indicators.isEmpty()) {
            return String.format(
                    "LOW RISK (%d/100): No active threat indicators detected for this %s on the local EVM sandbox.",
                    score, type.name().toLowerCase()
            );
        }

        TriggeredIndicator primary = indicators.get(0);
        return String.format(
                "%s RISK (%d/100): %s evaluated with %d triggered indicator(s). Primary concern: %s.",
                category.name(), score, type.name().toLowerCase(), indicators.size(), primary.title()
        );
    }
}
