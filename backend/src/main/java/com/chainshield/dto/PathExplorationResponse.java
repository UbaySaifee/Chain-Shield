package com.chainshield.dto;

import com.chainshield.graph.model.GraphEdgeDto;
import com.chainshield.graph.model.GraphNodeDto;

import java.util.List;

public record PathExplorationResponse(
        String sourceAddress,
        String targetAddress,
        boolean pathFound,
        int hops,
        List<GraphNodeDto> nodes,
        List<GraphEdgeDto> edges,
        String explanation,
        String disclaimer
) {
    public static final String STANDARD_DISCLAIMER =
            "PROTOTYPE PATH TRACER: An observed path reflects recorded historical transaction sequence. " +
            "It does not demonstrate collusion, common ownership, or malicious coordination between entities.";
}
