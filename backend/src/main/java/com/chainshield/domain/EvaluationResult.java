package com.chainshield.domain;

import java.util.List;
import java.util.Map;

public record EvaluationResult(
        int score,
        RiskCategory category,
        String summary,
        List<TriggeredIndicator> indicators,
        List<String> recommendations,
        Map<String, Object> metadata
) {}
