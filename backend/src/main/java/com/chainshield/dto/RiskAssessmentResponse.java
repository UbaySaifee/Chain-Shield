package com.chainshield.dto;

import com.chainshield.domain.RiskCategory;
import com.chainshield.domain.TargetType;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record RiskAssessmentResponse(
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
        Instant timestamp
) {
    public static final String STANDARD_PROTOTYPE_DISCLAIMER =
            "PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only. " +
            "Does not guarantee 100% exploit detection or financial safety.";
}
