package com.chainshield.contract.model;

public record CapabilityDto(
        String name,
        String category,
        String title,
        String description,
        boolean isPrivileged,
        String riskImpact
) {}
