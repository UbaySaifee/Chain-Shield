package com.chainshield.dto;

import java.util.Map;

public record DecodedCallDto(
        String methodSelector,
        String functionSignature,
        String actionType,
        Map<String, Object> parameters,
        boolean isApproval,
        String spenderAddress,
        boolean isUnlimitedApproval,
        String humanInterpretation
) {}
