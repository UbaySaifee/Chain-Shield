package com.chainshield.domain;

public record TriggeredIndicator(
        String code,
        String category,
        String title,
        Severity severity,
        int baseWeight,
        int appliedWeight,
        String explanation,
        String evidence
) {}
