package com.chainshield.dto;

import com.chainshield.contract.model.*;
import com.chainshield.domain.RiskCategory;
import com.chainshield.domain.TargetType;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Comprehensive explainable response record for EVM smart contract security analysis.
 * Fulfills Milestone 5 Requirement 14 while retaining compatibility with standard RiskAssessmentResponse.
 */
public record ContractAnalysisResponse(
        // Core Risk Assessment fields (identical to RiskAssessmentResponse for backwards compatibility)
        UUID id,
        String targetAddress,
        TargetType targetType,
        int score,
        RiskCategory severity,
        String summary,
        String disclaimer,
        List<RiskIndicatorDto> indicators,
        List<String> recommendations,
        Map<String, Object> metadata,
        Instant timestamp,

        // Contract-specific fields required by Milestone 5
        String address,
        String network,
        AccountClassification accountType,
        boolean isContract,
        ContractMetadataDto contractMetadata,
        OwnershipInfoDto ownershipInfo,
        AdminInfoDto adminInfo,
        ProxyInfoDto proxyInfo,
        AbiInfoDto abiInfo,
        List<CapabilityDto> detectedCapabilities,
        String limitations
) {
    public static final String STANDARD_PROTOTYPE_DISCLAIMER =
            "PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only. " +
            "Does not guarantee 100% exploit detection or financial safety.";

    public static final String STANDARD_LIMITATIONS =
            "ChainShield performs heuristic static analysis, read-only simulation, and cataloged threat matching on local EVM state. " +
            "It does not perform formal verification or trace unindexed private storage slots across dynamic multi-contract protocols. " +
            "Its risk assessment is an educational evaluation and not an absolute guarantee that a contract is safe or malicious.";

    @JsonProperty("accountClassification")
    public AccountClassification accountClassification() {
        return accountType;
    }

    @JsonProperty("codeExists")
    public boolean codeExists() {
        return isContract;
    }

    @JsonProperty("capabilities")
    public List<CapabilityDto> capabilities() {
        return detectedCapabilities;
    }
}

