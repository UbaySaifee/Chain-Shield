package com.chainshield.dto;

import java.time.Instant;

public record TransactionHistoryDto(
        String id,
        String type, // "ON_CHAIN" or "SIMULATION"
        Instant timestamp,
        String fromAddress,
        String toAddress,
        String functionName,
        String status, // "CONFIRMED", "SUCCESS", "REVERTED", "FAILED"
        String riskLevel, // "LOW", "MEDIUM", "HIGH", "CRITICAL", or null
        String txHash,
        String value,
        String tokenSymbol,
        String revertReason,
        Integer gasUsed
) {}
