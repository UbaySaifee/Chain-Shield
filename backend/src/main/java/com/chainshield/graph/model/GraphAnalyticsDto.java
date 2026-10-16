package com.chainshield.graph.model;

public record GraphAnalyticsDto(
        int totalNodes,
        int totalEdges,
        int walletCount,
        int contractCount,
        int directCounterparties,
        int inDegree,
        int outDegree,
        int nativeTransfersCount,
        int tokenTransfersCount,
        int contractInteractionsCount
) {}
