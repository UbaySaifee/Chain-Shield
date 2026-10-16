package com.chainshield.service;

import com.chainshield.dto.DashboardStatsResponse;
import com.chainshield.entity.AssessmentIndicator;
import com.chainshield.entity.RiskAssessment;
import com.chainshield.entity.SimulatedTransaction;
import com.chainshield.entity.TransactionGraphEdge;
import com.chainshield.repository.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final AnalyzedEntityRepository entityRepository;
    private final RiskAssessmentRepository assessmentRepository;
    private final RiskIndicatorRepository indicatorRepository;
    private final KnownThreatRepository threatRepository;
    private final SimulatedTransactionRepository simulatedTransactionRepository;
    private final TransactionGraphEdgeRepository edgeRepository;
    private final AssessmentIndicatorRepository assessmentIndicatorRepository;

    public DashboardService(
            AnalyzedEntityRepository entityRepository,
            RiskAssessmentRepository assessmentRepository,
            RiskIndicatorRepository indicatorRepository,
            KnownThreatRepository threatRepository,
            SimulatedTransactionRepository simulatedTransactionRepository,
            TransactionGraphEdgeRepository edgeRepository,
            AssessmentIndicatorRepository assessmentIndicatorRepository) {
        this.entityRepository = entityRepository;
        this.assessmentRepository = assessmentRepository;
        this.indicatorRepository = indicatorRepository;
        this.threatRepository = threatRepository;
        this.simulatedTransactionRepository = simulatedTransactionRepository;
        this.edgeRepository = edgeRepository;
        this.assessmentIndicatorRepository = assessmentIndicatorRepository;
    }

    public DashboardStatsResponse getDashboardStats() {
        long totalEntities = entityRepository.count();
        long totalSimulations = simulatedTransactionRepository.count();
        long activeIndicators = indicatorRepository.count();

        long lowCount = assessmentRepository.countByRiskCategory("LOW");
        long mediumCount = assessmentRepository.countByRiskCategory("MEDIUM");
        long highCount = assessmentRepository.countByRiskCategory("HIGH");
        long criticalCount = assessmentRepository.countByRiskCategory("CRITICAL");

        long walletAnalysesCount = assessmentRepository.countByTargetType("WALLET");
        long contractAnalysesCount = assessmentRepository.countByTargetType("CONTRACT");
        long transactionAnalysesCount = assessmentRepository.countByTargetType("TRANSACTION");

        Map<String, Long> distribution = new HashMap<>();
        distribution.put("LOW", lowCount);
        distribution.put("MEDIUM", mediumCount);
        distribution.put("HIGH", highCount);
        distribution.put("CRITICAL", criticalCount);

        List<RiskAssessment> recent = assessmentRepository.findTop10ByOrderByCreatedAtDesc();

        Map<UUID, List<String>> indicatorsMap = new HashMap<>();
        if (!recent.isEmpty()) {
            List<UUID> ids = recent.stream().map(RiskAssessment::getId).toList();
            List<AssessmentIndicator> indicators = assessmentIndicatorRepository.findByAssessmentIdIn(ids);
            for (AssessmentIndicator ai : indicators) {
                indicatorsMap.computeIfAbsent(ai.getAssessment().getId(), k -> new ArrayList<>())
                        .add(ai.getIndicator().getCode() + " - " + ai.getIndicator().getTitle());
            }
        }

        List<DashboardStatsResponse.RecentScanSummary> recentSummaries = recent.stream()
                .map(r -> new DashboardStatsResponse.RecentScanSummary(
                        r.getId().toString(),
                        r.getTargetAddress(),
                        r.getTargetType(),
                        r.getOverallScore(),
                        r.getRiskCategory(),
                        r.getSummaryExplanation(),
                        r.getCreatedAt(),
                        indicatorsMap.getOrDefault(r.getId(), List.of())
                ))
                .collect(Collectors.toList());

        List<SimulatedTransaction> recentSims = simulatedTransactionRepository.findTop10ByOrderBySimulatedAtDesc();
        List<DashboardStatsResponse.RecentSimulationSummary> recentSimSummaries = recentSims.stream()
                .map(s -> new DashboardStatsResponse.RecentSimulationSummary(
                        s.getId().toString(),
                        s.getFromAddress(),
                        s.getToAddress(),
                        s.getSimulationStatus(),
                        s.getGasUsed(),
                        s.getRevertReason(),
                        s.getSimulatedAt()
                ))
                .collect(Collectors.toList());

        List<TransactionGraphEdge> recentEdges = edgeRepository.findTop20ByOrderByBlockTimestampDesc();
        List<DashboardStatsResponse.RecentTransactionSummary> recentTxSummaries = recentEdges.stream()
                .map(e -> new DashboardStatsResponse.RecentTransactionSummary(
                        e.getTxHash(),
                        e.getFromAddress(),
                        e.getToAddress(),
                        e.getValueEth(),
                        e.getTokenSymbol(),
                        e.getRelationshipType(),
                        e.getFunctionName(),
                        e.getBlockTimestamp(),
                        e.getBlockNumber()
                ))
                .collect(Collectors.toList());

        Set<String> addresses = new LinkedHashSet<>();
        for (RiskAssessment a : recent) {
            if (a.getTargetAddress() != null && !a.getTargetAddress().isBlank()) {
                addresses.add(a.getTargetAddress());
            }
        }
        for (TransactionGraphEdge e : recentEdges) {
            if (e.getFromAddress() != null && !e.getFromAddress().isBlank()) {
                addresses.add(e.getFromAddress());
            }
            if (e.getToAddress() != null && !e.getToAddress().isBlank()) {
                addresses.add(e.getToAddress());
            }
        }
        List<String> recentAddresses = addresses.stream().limit(10).toList();

        List<String> recentIndicators = indicatorRepository.findAll().stream()
                .map(i -> i.getCode() + " - " + i.getTitle())
                .limit(10)
                .toList();

        return new DashboardStatsResponse(
                totalEntities,
                highCount + criticalCount,
                totalSimulations,
                activeIndicators,
                distribution,
                recentSummaries,
                walletAnalysesCount,
                contractAnalysesCount,
                transactionAnalysesCount,
                recentSimSummaries,
                recentTxSummaries,
                recentAddresses,
                recentIndicators
        );
    }
}
