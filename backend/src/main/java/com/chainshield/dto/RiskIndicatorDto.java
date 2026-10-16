package com.chainshield.dto;

public record RiskIndicatorDto(
        String code,
        String category,
        String title,
        String severity,
        int appliedWeight,
        String explanation,
        String evidence
) {}
