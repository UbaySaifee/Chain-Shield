package com.chainshield.controller;

import com.chainshield.dto.AddressSummaryResponse;
import com.chainshield.dto.PathExplorationRequest;
import com.chainshield.dto.PathExplorationResponse;
import com.chainshield.dto.TransactionGraphResponse;
import com.chainshield.graph.model.GraphEdgeDto;
import com.chainshield.graph.service.AddressIntelligenceService;
import com.chainshield.graph.service.DemoTransactionGraphSeeder;
import com.chainshield.graph.service.PathExplorationService;
import com.chainshield.graph.service.TransactionGraphService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller exposing REST endpoints for Blockchain Transaction Graph,
 * Address Intelligence, and Path Exploration.
 * Implements Milestone 6 Requirement 16.
 */
@RestController
@RequestMapping
public class TransactionGraphController {

    private final AddressIntelligenceService addressIntelligenceService;
    private final TransactionGraphService graphService;
    private final PathExplorationService pathExplorationService;
    private final DemoTransactionGraphSeeder demoSeeder;

    public TransactionGraphController(
            AddressIntelligenceService addressIntelligenceService,
            TransactionGraphService graphService,
            PathExplorationService pathExplorationService,
            DemoTransactionGraphSeeder demoSeeder
    ) {
        this.addressIntelligenceService = addressIntelligenceService;
        this.graphService = graphService;
        this.pathExplorationService = pathExplorationService;
        this.demoSeeder = demoSeeder;
    }

    /**
     * Retrieve address intelligence summary for an EVM address.
     */
    @GetMapping({"/api/address/{address}/summary", "/api/v1/address/{address}/summary"})
    public ResponseEntity<AddressSummaryResponse> getAddressSummary(
            @PathVariable String address,
            @RequestParam(required = false, defaultValue = "31337") Integer chainId
    ) {
        return ResponseEntity.ok(addressIntelligenceService.getAddressSummary(address, chainId));
    }

    /**
     * Retrieve the transaction graph centered around an EVM address.
     */
    @GetMapping({"/api/address/{address}/graph", "/api/v1/address/{address}/graph"})
    public ResponseEntity<TransactionGraphResponse> getTransactionGraph(
            @PathVariable String address,
            @RequestParam(required = false, defaultValue = "1") Integer depth,
            @RequestParam(required = false, defaultValue = "ALL") String nodeType,
            @RequestParam(required = false, defaultValue = "ALL") String edgeType,
            @RequestParam(required = false, defaultValue = "31337") Integer chainId
    ) {
        return ResponseEntity.ok(graphService.getTransactionGraph(address, chainId, depth, nodeType, edgeType));
    }

    /**
     * Retrieve direct transaction history for an address.
     */
    @GetMapping({"/api/address/{address}/transactions", "/api/v1/address/{address}/transactions"})
    public ResponseEntity<List<GraphEdgeDto>> getAddressTransactions(
            @PathVariable String address,
            @RequestParam(required = false, defaultValue = "50") Integer limit
    ) {
        return ResponseEntity.ok(graphService.getTransactionsForAddress(address, limit));
    }

    /**
     * Discover shortest transaction relationship path between two addresses.
     */
    @PostMapping({"/api/graph/path", "/api/v1/graph/path"})
    public ResponseEntity<PathExplorationResponse> explorePath(
            @Valid @RequestBody PathExplorationRequest request
    ) {
        return ResponseEntity.ok(pathExplorationService.findPath(request));
    }

    /**
     * Admin/Demo endpoint to trigger deterministic demonstration graph re-seeding.
     */
    @PostMapping({"/api/graph/seed-demo", "/api/v1/graph/seed-demo"})
    public ResponseEntity<Map<String, Object>> seedDemoGraph() {
        demoSeeder.seedDemoDataset();
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Deterministic Milestone 6 demonstration graph topology re-seeded successfully."
        ));
    }
}
