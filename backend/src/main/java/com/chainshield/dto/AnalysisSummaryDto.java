package com.chainshield.dto;

import com.chainshield.domain.RiskCategory;
import com.chainshield.domain.TargetType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AnalysisSummaryDto(
        UUID id,
        String targetAddress,
        TargetType targetType,
        int score,
        RiskCategory severity,
        String summary,
        Instant timestamp,
        List<String> keyIndicators
) {
    public AnalysisSummaryDto(
            UUID id,
            String targetAddress,
            TargetType targetType,
            int score,
            RiskCategory severity,
            String summary,
            Instant timestamp
    ) {
        this(id, targetAddress, targetType, score, severity, summary, timestamp, List.of());
    }
}
