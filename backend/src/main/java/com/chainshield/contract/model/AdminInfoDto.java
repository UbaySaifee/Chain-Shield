package com.chainshield.contract.model;

import java.util.List;

public record AdminInfoDto(
        boolean hasAdmin,
        String adminAddress,
        boolean accessControlDetected,
        List<String> rolesSummary,
        String details
) {}
