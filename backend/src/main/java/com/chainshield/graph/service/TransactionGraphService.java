package com.chainshield.graph.service;

import com.chainshield.blockchain.client.EvmRpcClient;
import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.chainshield.contract.model.AccountClassification;
import com.chainshield.contract.service.ContractDiscoveryService;
import com.chainshield.domain.RiskCategory;
import com.chainshield.dto.TransactionGraphResponse;
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
 * Service for building bounded, filtered, and evidence-annotated blockchain transaction graphs.
 * Implements Milestone 6 Requirements 2, 7, 8, 9, 10, and 22.
 */
@Service
public class TransactionGraphService {

    private static final Logger log = LoggerFactory.getLogger(TransactionGraphService.class);
    private static final Pattern EVM_ADDRESS_REGEX = Pattern.compile("^0x[a-fA-F0-9]{40}$");

    public static final int MAX_NODES = 50;
    public static final int MAX_EDGES = 100;

    private final TransactionGraphEdgeRepository edgeRepository;
    private final ContractDiscoveryService discoveryService;
    private final DeployedContractRegistry contractRegistry;
    private final EvmRpcClient rpcClient;
    private final KnownThreatRepository threatRepository;
    private final RiskAssessmentRepository assessmentRepository;

    public TransactionGraphService(
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
    public TransactionGraphResponse getTransactionGraph(
            String rawCenterAddress,
            Integer chainId,
            Integer depthParam,
            String nodeFilterParam,
            String edgeFilterParam
    ) {
        if (rawCenterAddress == null || !EVM_ADDRESS_REGEX.matcher(rawCenterAddress.trim()).matches()) {
            throw new IllegalArgumentException("Invalid EVM address format: " + rawCenterAddress);
        }

        String centerAddress = rawCenterAddress.trim().toLowerCase(Locale.ROOT);
        int depth = Math.max(1, Math.min(depthParam != null ? depthParam : 1, 3));
        String nodeFilter = (nodeFilterParam != null ? nodeFilterParam.trim().toUpperCase(Locale.ROOT) : "ALL");
        String edgeFilter = (edgeFilterParam != null ? edgeFilterParam.trim().toUpperCase(Locale.ROOT) : "ALL");
        String network = "LOCAL_DEMO_NETWORK (Chain ID: " + (chainId != null ? chainId : 31337) + ")";

        // BFS Traversal
        Set<String> visitedAddresses = new LinkedHashSet<>();
        Queue<TraversalNode> queue = new ArrayDeque<>();
        List<TransactionGraphEdge> collectedEdges = new ArrayList<>();
        Set<Long> collectedEdgeIds = new HashSet<>();

        visitedAddresses.add(centerAddress);
        queue.add(new TraversalNode(centerAddress, 0));

        while (!queue.isEmpty() && visitedAddresses.size() < MAX_NODES && collectedEdges.size() < MAX_EDGES) {
            TraversalNode current = queue.poll();

            if (current.depth >= depth) {
                continue;
            }

            List<TransactionGraphEdge> directEdges = edgeRepository.findDirectTransactionsForAddress(current.address);

            for (TransactionGraphEdge edge : directEdges) {
                if (collectedEdges.size() >= MAX_EDGES) {
                    break;
                }

                if (edge.getId() != null && collectedEdgeIds.contains(edge.getId())) {
                    continue;
                }

                // Check edge filter
                if (!matchesEdgeFilter(edge.getRelationshipType(), edgeFilter)) {
                    continue;
                }

                String counterparty = edge.getFromAddress().equalsIgnoreCase(current.address)
                        ? edge.getToAddress().toLowerCase(Locale.ROOT)
                        : edge.getFromAddress().toLowerCase(Locale.ROOT);

                // Check node filter for counterparty
                boolean counterpartyIsContract = discoveryService.discover(counterparty).isContract();
                if (!matchesNodeFilter(counterpartyIsContract, nodeFilter)) {
                    continue;
                }

                // Accept edge
                collectedEdges.add(edge);
                if (edge.getId() != null) {
                    collectedEdgeIds.add(edge.getId());
                }

                if (!visitedAddresses.contains(counterparty) && visitedAddresses.size() < MAX_NODES) {
                    visitedAddresses.add(counterparty);
                    queue.add(new TraversalNode(counterparty, current.depth + 1));
                }
            }
        }

        // Construct Node DTOs
        List<GraphNodeDto> nodes = new ArrayList<>();
        int walletCount = 0;
        int contractCount = 0;

        for (String addr : visitedAddresses) {
            GraphNodeDto node = buildNodeDto(addr, addr.equalsIgnoreCase(centerAddress));
            nodes.add(node);
            if (node.isContract()) {
                contractCount++;
            } else {
                walletCount++;
            }
        }

        // Construct Edge DTOs
        List<GraphEdgeDto> edges = new ArrayList<>();
        int inDegree = 0;
        int outDegree = 0;
        int nativeCount = 0;
        int tokenCount = 0;
        int contractCallCount = 0;
        Set<String> directCounterparties = new HashSet<>();

        for (TransactionGraphEdge edge : collectedEdges) {
            String from = edge.getFromAddress().toLowerCase(Locale.ROOT);
            String to = edge.getToAddress().toLowerCase(Locale.ROOT);

            // Calculate analytics relative to centerAddress
            if (from.equalsIgnoreCase(centerAddress)) {
                outDegree++;
                directCounterparties.add(to);
            }
            if (to.equalsIgnoreCase(centerAddress)) {
                inDegree++;
                directCounterparties.add(from);
            }

            GraphEdgeType edgeType = mapRelationshipType(edge.getRelationshipType());
            if (edgeType == GraphEdgeType.SENT_NATIVE || edgeType == GraphEdgeType.RECEIVED_NATIVE) {
                nativeCount++;
            } else if (edgeType == GraphEdgeType.TOKEN_TRANSFER) {
                tokenCount++;
            } else if (edgeType == GraphEdgeType.CONTRACT_INTERACTION) {
                contractCallCount++;
            }

            edges.add(new GraphEdgeDto(
                    edge.getId() != null ? String.valueOf(edge.getId()) : UUID.randomUUID().toString(),
                    from,
                    to,
                    edgeType,
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

        GraphAnalyticsDto analytics = new GraphAnalyticsDto(
                nodes.size(),
                edges.size(),
                walletCount,
                contractCount,
                directCounterparties.size(),
                inDegree,
                outDegree,
                nativeCount,
                tokenCount,
                contractCallCount
        );

        return new TransactionGraphResponse(
                centerAddress,
                depth,
                nodes,
                edges,
                analytics,
                TransactionGraphResponse.STANDARD_GRAPH_DISCLAIMER,
                network
        );
    }

    @Transactional(readOnly = true)
    public List<GraphEdgeDto> getTransactionsForAddress(String rawAddress, int limit) {
        if (rawAddress == null || !EVM_ADDRESS_REGEX.matcher(rawAddress.trim()).matches()) {
            throw new IllegalArgumentException("Invalid EVM address format: " + rawAddress);
        }
        String address = rawAddress.trim().toLowerCase(Locale.ROOT);
        int boundedLimit = Math.max(1, Math.min(limit, 100));

        List<TransactionGraphEdge> edges = edgeRepository.findDirectTransactionsForAddress(address);
        List<GraphEdgeDto> dtoList = new ArrayList<>();

        for (int i = 0; i < Math.min(edges.size(), boundedLimit); i++) {
            TransactionGraphEdge edge = edges.get(i);
            dtoList.add(new GraphEdgeDto(
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

        return dtoList;
    }

    private GraphNodeDto buildNodeDto(String address, boolean isCenter) {
        ContractDiscoveryService.DiscoveryResult discovery = discoveryService.discover(address);
        boolean isContract = discovery.isContract();
        GraphNodeType nodeType = isContract ? GraphNodeType.CONTRACT : GraphNodeType.WALLET;

        // Label Resolution
        String label = resolveLabel(address, isContract);

        // Balance & TxCount
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

        // Evidence-Based Security Indicator Overlay
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
        metadata.put("isCenter", isCenter);
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
        // 1. Check DeployedContractRegistry
        Optional<DeployedContractRegistry.DeployedContractInfo> contractInfo = contractRegistry.findByAddress(address);
        if (contractInfo.isPresent()) {
            return contractInfo.get().name();
        }

        // 2. Check Standard Hardhat Test Accounts
        if (DemoTransactionGraphSeeder.DEPLOYER.equalsIgnoreCase(address)) return "Deployer (Local)";
        if (DemoTransactionGraphSeeder.WALLET_A.equalsIgnoreCase(address)) return "Wallet A (Test User)";
        if (DemoTransactionGraphSeeder.WALLET_B.equalsIgnoreCase(address)) return "Wallet B (Counterparty)";
        if (DemoTransactionGraphSeeder.WALLET_C.equalsIgnoreCase(address)) return "Wallet C (Tertiary)";

        // 3. Shortened hex fallback
        if (address.length() == 42) {
            return (isContract ? "Contract " : "Wallet ") + address.substring(0, 6) + "..." + address.substring(38);
        }
        return address;
    }

    private boolean matchesNodeFilter(boolean isContract, String nodeFilter) {
        if ("ALL".equalsIgnoreCase(nodeFilter)) return true;
        if ("WALLETS".equalsIgnoreCase(nodeFilter) && !isContract) return true;
        if ("CONTRACTS".equalsIgnoreCase(nodeFilter) && isContract) return true;
        return false;
    }

    private boolean matchesEdgeFilter(String relationshipType, String edgeFilter) {
        if (relationshipType == null) return true;
        if ("ALL".equalsIgnoreCase(edgeFilter)) return true;

        String rel = relationshipType.toUpperCase(Locale.ROOT);
        return switch (edgeFilter) {
            case "NATIVE", "SENT_NATIVE", "RECEIVED_NATIVE" -> rel.contains("NATIVE") || rel.equals("TRANSFER");
            case "TOKEN", "TOKEN_TRANSFER" -> rel.contains("TOKEN") || rel.equals("APPROVAL");
            case "CONTRACT_CALL", "CONTRACT_INTERACTION" -> rel.contains("CONTRACT");
            default -> true;
        };
    }

    private GraphEdgeType mapRelationshipType(String raw) {
        if (raw == null) return GraphEdgeType.SENT_NATIVE;
        String upper = raw.toUpperCase(Locale.ROOT);
        if (upper.contains("TOKEN")) return GraphEdgeType.TOKEN_TRANSFER;
        if (upper.contains("CONTRACT")) return GraphEdgeType.CONTRACT_INTERACTION;
        if (upper.contains("RECEIVED")) return GraphEdgeType.RECEIVED_NATIVE;
        return GraphEdgeType.SENT_NATIVE;
    }

    private record TraversalNode(String address, int depth) {}
}
