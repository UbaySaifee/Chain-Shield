package com.chainshield.service;

import com.chainshield.domain.EvaluationResult;
import com.chainshield.domain.RiskCategory;
import com.chainshield.domain.TargetType;
import com.chainshield.domain.TriggeredIndicator;
import com.chainshield.dto.*;
import com.chainshield.entity.*;
import com.chainshield.exception.ResourceNotFoundException;
import com.chainshield.provider.BlockchainDataProvider;
import com.chainshield.provider.model.ContractData;
import com.chainshield.provider.model.TransactionData;
import com.chainshield.provider.model.WalletData;
import com.chainshield.repository.*;
import com.chainshield.service.risk.DeterministicRiskEngine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RiskAnalysisService {

    private final BlockchainDataProvider dataProvider;
    private final DeterministicRiskEngine riskEngine;
    private final AnalyzedEntityRepository entityRepository;
    private final RiskAssessmentRepository assessmentRepository;
    private final RiskIndicatorRepository indicatorRepository;
    private final AssessmentIndicatorRepository assessmentIndicatorRepository;
    private final com.chainshield.contract.service.ContractAnalysisPipeline contractAnalysisPipeline;

    public RiskAnalysisService(
            BlockchainDataProvider dataProvider,
            DeterministicRiskEngine riskEngine,
            AnalyzedEntityRepository entityRepository,
            RiskAssessmentRepository assessmentRepository,
            RiskIndicatorRepository indicatorRepository,
            AssessmentIndicatorRepository assessmentIndicatorRepository,
            com.chainshield.contract.service.ContractAnalysisPipeline contractAnalysisPipeline
    ) {
        this.dataProvider = dataProvider;
        this.riskEngine = riskEngine;
        this.entityRepository = entityRepository;
        this.assessmentRepository = assessmentRepository;
        this.indicatorRepository = indicatorRepository;
        this.assessmentIndicatorRepository = assessmentIndicatorRepository;
        this.contractAnalysisPipeline = contractAnalysisPipeline;
    }

    @Transactional
    public RiskAssessmentResponse analyzeWallet(WalletAnalysisRequest request) {
        String address = request.address().trim();
        WalletData walletData = dataProvider.getWalletData(address);
        EvaluationResult evaluation = riskEngine.evaluateWallet(walletData);

        return persistAndBuildResponse(address, TargetType.WALLET, evaluation);
    }

    @Transactional
    public ContractAnalysisResponse analyzeContract(ContractAnalysisRequest request) {
        return contractAnalysisPipeline.analyzeContract(
                request.contractAddress(),
                request.chainId()
        );
    }

    @Transactional
    public RiskAssessmentResponse analyzeTransaction(TransactionAnalysisRequest request) {
        TransactionData txData = dataProvider.inspectTransaction(
                request.fromAddress().trim(),
                request.toAddress().trim(),
                request.valueWei(),
                request.calldata()
        );
        EvaluationResult evaluation = riskEngine.evaluateTransaction(txData);

        return persistAndBuildResponse(request.toAddress().trim(), TargetType.TRANSACTION, evaluation);
    }

    @Transactional(readOnly = true)
    public List<AnalysisSummaryDto> getAnalysisHistory(String targetType) {
        List<RiskAssessment> assessments;
        if (targetType != null && !targetType.isBlank()) {
            assessments = assessmentRepository.findByTargetTypeOrderByCreatedAtDesc(targetType.trim().toUpperCase());
        } else {
            assessments = assessmentRepository.findAllByOrderByCreatedAtDesc();
        }

        Map<UUID, List<String>> indicatorsMap = new HashMap<>();
        if (!assessments.isEmpty()) {
            List<UUID> ids = assessments.stream().map(RiskAssessment::getId).toList();
            List<AssessmentIndicator> indicators = assessmentIndicatorRepository.findByAssessmentIdIn(ids);
            for (AssessmentIndicator ai : indicators) {
                indicatorsMap.computeIfAbsent(ai.getAssessment().getId(), k -> new ArrayList<>())
                        .add(ai.getIndicator().getCode() + " - " + ai.getIndicator().getTitle());
            }
        }

        return assessments.stream()
                .map(a -> new AnalysisSummaryDto(
                        a.getId(),
                        a.getTargetAddress(),
                        TargetType.valueOf(a.getTargetType()),
                        a.getOverallScore(),
                        RiskCategory.valueOf(a.getRiskCategory()),
                        a.getSummaryExplanation(),
                        a.getCreatedAt(),
                        indicatorsMap.getOrDefault(a.getId(), List.of())
                ))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AnalysisSummaryDto> getAnalysisHistory() {
        return getAnalysisHistory(null);
    }


    @Transactional(readOnly = true)
    public RiskAssessmentResponse getAnalysisById(UUID id) {
        RiskAssessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Analysis record not found for ID: " + id));

        List<AssessmentIndicator> indicators = assessmentIndicatorRepository.findByAssessmentId(id);
        List<RiskIndicatorDto> indicatorDtos = indicators.stream()
                .map(ai -> new RiskIndicatorDto(
                        ai.getIndicator().getCode(),
                        ai.getIndicator().getCategory(),
                        ai.getIndicator().getTitle(),
                        ai.getIndicator().getSeverity(),
                        ai.getAppliedWeight(),
                        ai.getContextExplanation(),
                        ai.getEvidenceData()
                ))
                .collect(Collectors.toList());

        return new RiskAssessmentResponse(
                assessment.getId(),
                assessment.getTargetAddress(),
                TargetType.valueOf(assessment.getTargetType()),
                assessment.getOverallScore(),
                RiskCategory.valueOf(assessment.getRiskCategory()),
                assessment.getSummaryExplanation(),
                RiskAssessmentResponse.STANDARD_PROTOTYPE_DISCLAIMER,
                indicatorDtos,
                List.of("Review indicators before confirming interactions."),
                Map.of("created", assessment.getCreatedAt().toString()),
                assessment.getCreatedAt()
        );
    }

    private RiskAssessmentResponse persistAndBuildResponse(
            String targetAddress,
            TargetType targetType,
            EvaluationResult evaluation
    ) {
        // 1. Upsert Analyzed Entity
        AnalyzedEntity entity = entityRepository.findByAddressIgnoreCase(targetAddress)
                .orElseGet(() -> new AnalyzedEntity(
                        targetAddress,
                        targetType.name(),
                        targetType + "_" + targetAddress.substring(0, Math.min(8, targetAddress.length())),
                        evaluation.score()
                ));
        entity.setOverallReputationScore(evaluation.score());
        entity.setLastAnalyzedAt(Instant.now());
        entity = entityRepository.save(entity);

        // 2. Persist Risk Assessment
        RiskAssessment assessment = new RiskAssessment();
        assessment.setEntity(entity);
        assessment.setTargetAddress(targetAddress);
        assessment.setTargetType(targetType.name());
        assessment.setOverallScore(evaluation.score());
        assessment.setRiskCategory(evaluation.category().name());
        assessment.setSummaryExplanation(evaluation.summary());
        assessment = assessmentRepository.save(assessment);

        // 3. Persist Triggered Indicators
        List<RiskIndicatorDto> indicatorDtos = new ArrayList<>();
        for (TriggeredIndicator ind : evaluation.indicators()) {
            RiskIndicator dbIndicator = indicatorRepository.findByCode(ind.code())
                    .orElseGet(() -> indicatorRepository.save(new RiskIndicator(
                            ind.code(),
                            ind.category(),
                            ind.title(),
                            ind.explanation(),
                            ind.severity().name(),
                            ind.baseWeight()
                    )));

            AssessmentIndicator link = new AssessmentIndicator();
            link.setAssessment(assessment);
            link.setIndicator(dbIndicator);
            link.setAppliedWeight(ind.appliedWeight());
            link.setContextExplanation(ind.explanation());
            link.setEvidenceData(ind.evidence());
            assessmentIndicatorRepository.save(link);

            indicatorDtos.add(new RiskIndicatorDto(
                    ind.code(),
                    ind.category(),
                    ind.title(),
                    ind.severity().name(),
                    ind.appliedWeight(),
                    ind.explanation(),
                    ind.evidence()
            ));
        }

        return new RiskAssessmentResponse(
                assessment.getId(),
                targetAddress,
                targetType,
                evaluation.score(),
                evaluation.category(),
                evaluation.summary(),
                RiskAssessmentResponse.STANDARD_PROTOTYPE_DISCLAIMER,
                indicatorDtos,
                evaluation.recommendations(),
                evaluation.metadata(),
                assessment.getCreatedAt()
        );
    }

    private AnalysisSummaryDto mapToSummaryDto(RiskAssessment assessment) {
        return new AnalysisSummaryDto(
                assessment.getId(),
                assessment.getTargetAddress(),
                TargetType.valueOf(assessment.getTargetType()),
                assessment.getOverallScore(),
                RiskCategory.valueOf(assessment.getRiskCategory()),
                assessment.getSummaryExplanation(),
                assessment.getCreatedAt()
        );
    }
}
