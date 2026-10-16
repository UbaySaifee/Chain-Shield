package com.chainshield.graph.service;

import com.chainshield.blockchain.client.EvmRpcClient;
import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.chainshield.contract.model.AccountClassification;
import com.chainshield.contract.service.ContractDiscoveryService;
import com.chainshield.domain.RiskCategory;
import com.chainshield.dto.AddressSummaryResponse;
import com.chainshield.entity.KnownThreat;
import com.chainshield.entity.RiskAssessment;
import com.chainshield.entity.TransactionGraphEdge;
import com.chainshield.graph.model.GraphNodeDto.NodeIndicatorSummary;
import com.chainshield.repository.KnownThreatRepository;
import com.chainshield.repository.RiskAssessmentRepository;
import com.chainshield.repository.TransactionGraphEdgeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.util.*;

@Service
public class AddressIntelligenceService {

    private final EvmRpcClient rpcClient;
    private final ContractDiscoveryService discoveryService;
    private final DeployedContractRegistry contractRegistry;
    private final TransactionGraphEdgeRepository edgeRepository;
    private final KnownThreatRepository threatRepository;
    private final RiskAssessmentRepository assessmentRepository;

    public AddressIntelligenceService(
            EvmRpcClient rpcClient,
            ContractDiscoveryService discoveryService,
            DeployedContractRegistry contractRegistry,
            TransactionGraphEdgeRepository edgeRepository,
            KnownThreatRepository threatRepository,
            RiskAssessmentRepository assessmentRepository
    ) {
        this.rpcClient = rpcClient;
        this.discoveryService = discoveryService;
        this.contractRegistry = contractRegistry;
        this.edgeRepository = edgeRepository;
        this.threatRepository = threatRepository;
        this.assessmentRepository = assessmentRepository;
    }

    @Transactional(readOnly = true)
    public AddressSummaryResponse getAddressSummary(String rawAddress, Integer chainId) {
        String address = rawAddress.trim().toLowerCase(Locale.ROOT);
        String networkDisplay = "LOCAL_DEMO_NETWORK (Chain ID: " + (chainId != null ? chainId : 31337) + ")";

        // 1. Account Discovery & Classification
        ContractDiscoveryService.DiscoveryResult discovery = discoveryService.discover(address);
        boolean isContract = discovery.isContract();
        AccountClassification classification = discovery.classification();

        // 2. Query Live EVM Balance & Nonce
        String nativeBalanceEth = "0.0000 ETH";
        long txCount = 0;
        try {
            if (rpcClient.isAvailable()) {
                BigInteger balanceWei = rpcClient.getBalance(address);
                BigDecimal ethVal = new BigDecimal(balanceWei).divide(new BigDecimal("1000000000000000000"), 4, RoundingMode.HALF_UP);
                nativeBalanceEth = ethVal.toPlainString() + " ETH";
                txCount = rpcClient.getTransactionCount(address);
            } else {
                // Offline fallback default
                nativeBalanceEth = isContract ? "0.0000 ETH" : "10000.0000 ETH";
            }
        } catch (Exception e) {
            nativeBalanceEth = "0.0000 ETH";
        }

        // 3. Historical Transaction Graph Relationships
        List<TransactionGraphEdge> edges = edgeRepository.findDirectTransactionsForAddress(address);
        long contractInteractions = 0;
        long tokenTransfers = 0;
        Set<String> uniqueCounterparties = new HashSet<>();
        Set<String> relatedContracts = new HashSet<>();
        Set<String> relatedAddresses = new HashSet<>();

        String firstSeen = edges.isEmpty() ? "N/A (No local transactions recorded)" : edges.get(edges.size() - 1).getBlockTimestamp().toString();
        String lastActive = edges.isEmpty() ? "N/A" : edges.get(0).getBlockTimestamp().toString();

        for (TransactionGraphEdge edge : edges) {
            String cp = edge.getFromAddress().equalsIgnoreCase(address) ? edge.getToAddress() : edge.getFromAddress();
            uniqueCounterparties.add(cp.toLowerCase(Locale.ROOT));

            if ("CONTRACT_INTERACTION".equalsIgnoreCase(edge.getRelationshipType())) {
                contractInteractions++;
                relatedContracts.add(cp.toLowerCase(Locale.ROOT));
            } else if ("TOKEN_TRANSFER".equalsIgnoreCase(edge.getRelationshipType())) {
                tokenTransfers++;
                if (edge.getTokenAddress() != null) {
                    relatedContracts.add(edge.getTokenAddress().toLowerCase(Locale.ROOT));
                }
                relatedAddresses.add(cp.toLowerCase(Locale.ROOT));
            } else {
                relatedAddresses.add(cp.toLowerCase(Locale.ROOT));
            }
        }

        if (txCount == 0) {
            txCount = edges.size();
        }

        // 4. Evidence-Grounded Security Indicators & Risk Scoring
        List<NodeIndicatorSummary> indicators = new ArrayList<>();
        int riskScore = 0;
        RiskCategory riskSeverity = RiskCategory.LOW;
        String summary = "LOW RISK: Standard address on the local EVM environment with no active threat indicators.";

        // Threat Database Check
        Optional<KnownThreat> threatMatch = threatRepository.findByAddressIgnoreCase(address);
        if (threatMatch.isPresent()) {
            KnownThreat threat = threatMatch.get();
            riskScore = 95;
            riskSeverity = RiskCategory.CRITICAL;
            summary = "CRITICAL RISK (95/100): Address matched active threat record in local threat registry (" + threat.getThreatType() + ").";
            indicators.add(new NodeIndicatorSummary(
                    "IND-W01",
                    "Known Threat Registry Match",
                    "CRITICAL",
                    threat.getDescription() + " (Source: " + threat.getSourceFeed() + ")",
                    "LOCAL_DEMO"
            ));
        } else {
            // Check Prior Assessments
            List<RiskAssessment> assessments = assessmentRepository.findAllByOrderByCreatedAtDesc();
            for (RiskAssessment ra : assessments) {
                if (ra.getTargetAddress().equalsIgnoreCase(address)) {
                    riskScore = ra.getOverallScore();
                    riskSeverity = RiskCategory.valueOf(ra.getRiskCategory());
                    summary = ra.getSummaryExplanation();
                    break;
                }
            }
        }

        String dataAvailability = edges.isEmpty() ? "LIMITED_DATA" : "COMPLETE_LOCAL";

        return new AddressSummaryResponse(
                address,
                classification,
                isContract,
                nativeBalanceEth,
                txCount,
                contractInteractions,
                tokenTransfers,
                uniqueCounterparties.size(),
                firstSeen,
                lastActive,
                riskScore,
                riskSeverity,
                summary,
                indicators,
                new ArrayList<>(relatedContracts),
                new ArrayList<>(relatedAddresses),
                dataAvailability,
                networkDisplay,
                AddressSummaryResponse.STANDARD_DISCLAIMER
        );
    }
}
