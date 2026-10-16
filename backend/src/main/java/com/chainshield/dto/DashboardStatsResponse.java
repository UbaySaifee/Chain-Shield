package com.chainshield.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record DashboardStatsResponse(
        long totalScannedEntities,
        long highRiskDetectedCount,
        long simulationsExecuted,
        long activeThreatIndicatorsCount,
        Map<String, Long> riskDistribution,
        List<RecentScanSummary> recentAssessments,
        long walletAnalysesCount,
        long contractAnalysesCount,
        long transactionAnalysesCount,
        List<RecentSimulationSummary> recentSimulations,
        List<RecentTransactionSummary> recentTransactions,
        List<String> recentAddresses,
        List<String> recentIndicators
) {
    public record RecentScanSummary(
            String id,
            String targetAddress,
            String targetType,
            int overallScore,
            String riskCategory,
            String primaryWarning,
            Instant timestamp,
            List<String> keyIndicators
    ) {
        public RecentScanSummary(
                String id,
                String targetAddress,
                String targetType,
                int overallScore,
                String riskCategory,
                String primaryWarning,
                Instant timestamp
        ) {
            this(id, targetAddress, targetType, overallScore, riskCategory, primaryWarning, timestamp, List.of());
        }
    }

    public record RecentSimulationSummary(
            String id,
            String fromAddress,
            String toAddress,
            String simulationStatus,
            Integer gasUsed,
            String revertReason,
            Instant simulatedAt
    ) {}

    public record RecentTransactionSummary(
            String txHash,
            String fromAddress,
            String toAddress,
            BigDecimal valueEth,
            String tokenSymbol,
            String relationshipType,
            String functionName,
            Instant blockTimestamp,
            Long blockNumber
    ) {}

    // Backwards compatible constructor
    public DashboardStatsResponse(
            long totalScannedEntities,
            long highRiskDetectedCount,
            long simulationsExecuted,
            long activeThreatIndicatorsCount,
            Map<String, Long> riskDistribution,
            List<RecentScanSummary> recentAssessments
    ) {
        this(
                totalScannedEntities,
                highRiskDetectedCount,
                simulationsExecuted,
                activeThreatIndicatorsCount,
                riskDistribution,
                recentAssessments,
                0L,
                0L,
                0L,
                List.of(),
                List.of(),
                List.of(),
                List.of()
        );
    }
}
