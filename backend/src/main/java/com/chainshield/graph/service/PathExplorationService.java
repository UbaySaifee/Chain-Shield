package com.chainshield.graph.service;

import com.chainshield.blockchain.client.EvmRpcClient;
import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.chainshield.contract.service.ContractDiscoveryService;
import com.chainshield.domain.RiskCategory;
import com.chainshield.dto.PathExplorationRequest;
import com.chainshield.dto.PathExplorationResponse;
import com.chainshield.entity.KnownThreat;
import com.chainshield.entity.RiskAssessment;
import com.chainshield.entity.TransactionGraphEdge;
import com.chainshield.graph.model.*;
import com.chainshield.graph.model.GraphNodeDto.NodeIndicatorSummary;
import com.chainshield.repository.KnownThreatRepository;
import com.chainshield.repository.RiskAssessmentRepository;
import com.chainshield.repository.TransactionGraphEdgeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Service for discovering on-chain transaction paths between any two addresses.
 * Implements Milestone 6 Requirement 14.
 */
@Service
public class PathExplorationService {

    private static final Logger log = LoggerFactory.getLogger(PathExplorationService.class);
    private static final Pattern EVM_ADDRESS_REGEX = Pattern.compile("^0x[a-fA-F0-9]{40}$");

    private final TransactionGraphEdgeRepository edgeRepository;
    private final ContractDiscoveryService discoveryService;
    private final DeployedContractRegistry contractRegistry;
    private final EvmRpcClient rpcClient;
    private final KnownThreatRepository threatRepository;
    private final RiskAssessmentRepository assessmentRepository;

    public PathExplorationService(
            TransactionGraphEdgeRepository edgeRepository,
            ContractDiscoveryService discoveryService,
            DeployedContractRegistry contractRegistry,
            EvmRpcClient rpcClient,
            KnownThreatRepository threatRepository,
            RiskAssessmentRepository assessmentRepository
    ) {
        this.edgeRepository = edgeRepository;
        this.discoveryService = discoveryService;
        this.contractRegistry = contractRegistry;
        this.rpcClient = rpcClient;
        this.threatRepository = threatRepository;
        this.assessmentRepository = assessmentRepository;
    }

    @Transactional(readOnly = true)
    public PathExplorationResponse findPath(PathExplorationRequest request) {
        if (request.sourceAddress() == null || !EVM_ADDRESS_REGEX.matcher(request.sourceAddress().trim()).matches()) {
            throw new IllegalArgumentException("Invalid source EVM address format: " + request.sourceAddress());
        }
        if (request.targetAddress() == null || !EVM_ADDRESS_REGEX.matcher(request.targetAddress().trim()).matches()) {
            throw new IllegalArgumentException("Invalid target EVM address format: " + request.targetAddress());
        }

        String source = request.sourceAddress().trim().toLowerCase(Locale.ROOT);
        String target = request.targetAddress().trim().toLowerCase(Locale.ROOT);
        int maxDepth = Math.max(1, Math.min(request.maxDepth() != null ? request.maxDepth() : 3, 4));

        if (source.equalsIgnoreCase(target)) {
            GraphNodeDto singleNode = buildNodeDto(source);
            return new PathExplorationResponse(
                    source,
                    target,
                    true,
                    0,
                    List.of(singleNode),
                    List.of(),
                    "Source and target addresses are identical (0 hops).",
                    PathExplorationResponse.STANDARD_DISCLAIMER
            );
        }

        // BFS Path Discovery
        Queue<List<PathStep>> queue = new ArrayDeque<>();
        Set<String> visited = new HashSet<>();

        visited.add(source);
        queue.add(List.of(new PathStep(source, null)));

        List<PathStep> successfulPath = null;

        while (!queue.isEmpty()) {
            List<PathStep> currentPath = queue.poll();
            PathStep lastStep = currentPath.get(currentPath.size() - 1);

            if (currentPath.size() - 1 >= maxDepth) {
                continue;
            }

            List<TransactionGraphEdge> directEdges = edgeRepository.findDirectTransactionsForAddress(lastStep.address);

            for (TransactionGraphEdge edge : directEdges) {
                String neighbor = edge.getFromAddress().equalsIgnoreCase(lastStep.address)
                        ? edge.getToAddress().toLowerCase(Locale.ROOT)
                        : edge.getFromAddress().toLowerCase(Locale.ROOT);

                if (neighbor.equalsIgnoreCase(target)) {
                    List<PathStep> finished = new ArrayList<>(currentPath);
                    finished.add(new PathStep(neighbor, edge));
                    successfulPath = finished;
                    break;
                }

                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    List<PathStep> next = new ArrayList<>(currentPath);
                    next.add(new PathStep(neighbor, edge));
                    queue.add(next);
                }
            }

            if (successfulPath != null) {
                break;
            }
        }

        if (successfulPath != null) {
            List<GraphNodeDto> nodes = new ArrayList<>();
            List<GraphEdgeDto> edges = new ArrayList<>();

            for (int i = 0; i < successfulPath.size(); i++) {
                PathStep step = successfulPath.get(i);
                nodes.add(buildNodeDto(step.address));

                if (step.edge != null) {
                    TransactionGraphEdge edge = step.edge;
                    edges.add(new GraphEdgeDto(
                            edge.getId() != null ? String.valueOf(edge.getId()) : UUID.randomUUID().toString(),
                            edge.getFromAddress().toLowerCase(Locale.ROOT),
                            edge.getToAddress().toLowerCase(Locale.ROOT),
                            mapRelationshipType(edge.getRelationshipType()),
                            edge.getTxHash(),
                            edge.getBlockNumber(),
                            edge.getBlockTimestamp() != null ? edge.getBlockTimestamp().toString() : "",
                            edge.getValueEth(),
                            edge.getTokenAddress(),
                            edge.getTokenSymbol(),
                            edge.getTokenAmount(),
                            edge.getFunctionName(),
                            edge.getNetwork() != null ? edge.getNetwork() : "LOCAL_DEMO_NETWORK"
                    ));
                }
            }

            int hops = edges.size();
            String explanation = String.format(
                    "Observed on-chain transaction path of %d hop(s) discovered between %s and %s.",
                    hops, source, target
            );

            return new PathExplorationResponse(
                    source,
                    target,
                    true,
                    hops,
                    nodes,
                    edges,
                    explanation,
                    PathExplorationResponse.STANDARD_DISCLAIMER
            );
        }

        String noPathExplanation = String.format(
                "No direct or indirect transaction path observed between %s and %s within maximum depth of %d hops in local data.",
                source, target, maxDepth
        );

        return new PathExplorationResponse(
                source,
                target,
                false,
                0,
                List.of(),
                List.of(),
                noPathExplanation,
                PathExplorationResponse.STANDARD_DISCLAIMER
        );
    }

    private GraphNodeDto buildNodeDto(String address) {
        ContractDiscoveryService.DiscoveryResult discovery = discoveryService.discover(address);
        boolean isContract = discovery.isContract();
        GraphNodeType nodeType = isContract ? GraphNodeType.CONTRACT : GraphNodeType.WALLET;
        String label = resolveLabel(address, isContract);

        String balanceEth = "0.0000 ETH";
        long txCount = 0;
        try {
            if (rpcClient.isAvailable()) {
                BigInteger balWei = rpcClient.getBalance(address);
                BigDecimal ethVal = new BigDecimal(balWei).divide(new BigDecimal("1000000000000000000"), 4, RoundingMode.HALF_UP);
                balanceEth = ethVal.toPlainString() + " ETH";
                txCount = rpcClient.getTransactionCount(address);
            } else {
                balanceEth = isContract ? "0.0000 ETH" : "100.0000 ETH";
            }
        } catch (Exception e) {
            balanceEth = "0.0000 ETH";
        }

        if (txCount == 0) {
            txCount = edgeRepository.countByFromAddressIgnoreCaseOrToAddressIgnoreCase(address, address);
        }

        List<NodeIndicatorSummary> indicators = new ArrayList<>();
        int riskScore = 0;
        RiskCategory riskSeverity = RiskCategory.LOW;

        Optional<KnownThreat> threatOpt = threatRepository.findByAddressIgnoreCase(address);
        if (threatOpt.isPresent()) {
            KnownThreat threat = threatOpt.get();
            riskScore = 95;
            riskSeverity = RiskCategory.CRITICAL;
            indicators.add(new NodeIndicatorSummary(
                    "IND-THREAT-01",
                    "Threat Registry Match",
                    "CRITICAL",
                    threat.getDescription() + " (Source: " + threat.getSourceFeed() + ")",
                    "LOCAL_DEMO"
            ));
        } else {
            List<RiskAssessment> assessments = assessmentRepository.findAllByOrderByCreatedAtDesc();
            for (RiskAssessment ra : assessments) {
                if (ra.getTargetAddress().equalsIgnoreCase(address)) {
                    riskScore = ra.getOverallScore();
                    riskSeverity = RiskCategory.valueOf(ra.getRiskCategory());
                    if (riskScore >= 70) {
                        indicators.add(new NodeIndicatorSummary(
                                "IND-ASSESS-" + ra.getId().toString().substring(0, 8),
                                "High Risk Assessment Detected",
                                riskSeverity.name(),
                                ra.getSummaryExplanation(),
                                "PRIOR_ASSESSMENT"
                        ));
                    }
                    break;
                }
            }
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("classification", discovery.classification().name());
        metadata.put("verifiedInRegistry", contractRegistry.findByAddress(address).isPresent());

        return new GraphNodeDto(
                address,
                label,
                nodeType,
                isContract,
                balanceEth,
                txCount,
                riskScore,
                riskSeverity,
                !indicators.isEmpty(),
                indicators,
                metadata
        );
    }

    private String resolveLabel(String address, boolean isContract) {
        Optional<DeployedContractRegistry.DeployedContractInfo> contractInfo = contractRegistry.findByAddress(address);
        if (contractInfo.isPresent()) return contractInfo.get().name();

        if (DemoTransactionGraphSeeder.DEPLOYER.equalsIgnoreCase(address)) return "Deployer (Local)";
        if (DemoTransactionGraphSeeder.WALLET_A.equalsIgnoreCase(address)) return "Wallet A (Test User)";
        if (DemoTransactionGraphSeeder.WALLET_B.equalsIgnoreCase(address)) return "Wallet B (Counterparty)";
        if (DemoTransactionGraphSeeder.WALLET_C.equalsIgnoreCase(address)) return "Wallet C (Tertiary)";

        if (address.length() == 42) {
            return (isContract ? "Contract " : "Wallet ") + address.substring(0, 6) + "..." + address.substring(38);
        }
        return address;
    }

    private GraphEdgeType mapRelationshipType(String raw) {
        if (raw == null) return GraphEdgeType.SENT_NATIVE;
        String upper = raw.toUpperCase(Locale.ROOT);
        if (upper.contains("TOKEN")) return GraphEdgeType.TOKEN_TRANSFER;
        if (upper.contains("CONTRACT")) return GraphEdgeType.CONTRACT_INTERACTION;
        if (upper.contains("RECEIVED")) return GraphEdgeType.RECEIVED_NATIVE;
        return GraphEdgeType.SENT_NATIVE;
    }

    private record PathStep(String address, TransactionGraphEdge edge) {}
}
