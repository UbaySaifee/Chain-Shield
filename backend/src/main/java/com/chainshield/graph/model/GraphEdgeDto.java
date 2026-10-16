package com.chainshield.graph.model;

import java.math.BigDecimal;

public record GraphEdgeDto(
        String id,
        String from,
        String to,
        GraphEdgeType relationshipType,
        String txHash,
        Long blockNumber,
        String timestamp,
        BigDecimal valueEth,
        String tokenContract,
        String tokenSymbol,
        String tokenAmount,
        String functionName,
        String network
) {}
