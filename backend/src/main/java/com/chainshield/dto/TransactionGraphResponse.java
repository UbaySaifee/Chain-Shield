package com.chainshield.dto;

import com.chainshield.graph.model.GraphAnalyticsDto;
import com.chainshield.graph.model.GraphEdgeDto;
import com.chainshield.graph.model.GraphNodeDto;

import java.util.List;

public record TransactionGraphResponse(
        String centerAddress,
        int depth,
        List<GraphNodeDto> nodes,
        List<GraphEdgeDto> edges,
        GraphAnalyticsDto analytics,
        String disclaimer,
        String network
) {
    public static final String STANDARD_GRAPH_DISCLAIMER =
            "PROTOTYPE FORENSIC GRAPH: Observed edges represent historical on-chain transactions or events. " +
            "A relationship between addresses does not imply fraud, shared ownership, or conspiracy. " +
            "Risk evaluations are individual, evidence-grounded assessments on local testbed data.";
}
