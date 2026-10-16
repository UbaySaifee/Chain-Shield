package com.chainshield.dto;

import com.chainshield.contract.model.AccountClassification;
import com.chainshield.domain.RiskCategory;
import com.chainshield.graph.model.GraphNodeDto.NodeIndicatorSummary;

import java.util.List;

public record AddressSummaryResponse(
        String address,
        AccountClassification accountType,
        boolean isContract,
        String nativeBalanceEth,
        long transactionCount,
        long contractInteractionCount,
        long tokenTransferCount,
        int uniqueCounterpartiesCount,
        String firstSeenAt,
        String lastActiveAt,
        int riskScore,
        RiskCategory riskSeverity,
        String summary,
        List<NodeIndicatorSummary> indicators,
        List<String> relatedContracts,
        List<String> relatedAddresses,
        String dataAvailability,
        String network,
        String disclaimer
) {
    public static final String STANDARD_DISCLAIMER =
            "PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only. " +
            "Does not guarantee 100% exploit detection or financial safety.";
}
