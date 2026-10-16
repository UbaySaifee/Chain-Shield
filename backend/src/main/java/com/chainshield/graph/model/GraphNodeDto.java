package com.chainshield.graph.model;

import com.chainshield.domain.RiskCategory;
import java.util.List;
import java.util.Map;

public record GraphNodeDto(
        String id,
        String label,
        GraphNodeType type,
        boolean isContract,
        String balanceEth,
        long txCount,
        int riskScore,
        RiskCategory riskSeverity,
        boolean hasIndicator,
        List<NodeIndicatorSummary> indicators,
        Map<String, Object> metadata
) {
    public record NodeIndicatorSummary(
            String code,
            String title,
            String severity,
            String evidence,
            String source
    ) {}
}
