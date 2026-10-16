package com.chainshield.simulation;

import com.chainshield.blockchain.client.EvmRpcClient;
import com.chainshield.blockchain.decoder.CalldataDecoder;
import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.chainshield.domain.EvaluationResult;
import com.chainshield.domain.TargetType;
import com.chainshield.domain.TriggeredIndicator;
import com.chainshield.dto.*;
import com.chainshield.entity.*;
import com.chainshield.repository.*;
import com.chainshield.service.risk.DeterministicRiskEngine;
import com.chainshield.simulation.model.StateEffectResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Core pre-execution simulation service executing read-only eth_call against local Hardhat EVM.
 * Performs call decoding, on-chain execution, revert extraction, state-delta projection,
 * and deterministic risk scoring.
 */
@Service
public class TransactionSimulationService {

    private static final Logger log = LoggerFactory.getLogger(TransactionSimulationService.class);

    private final EvmRpcClient rpcClient;
    private final CalldataDecoder calldataDecoder;
    private final StateEffectAnalyzer stateEffectAnalyzer;
    private final DeployedContractRegistry contractRegistry;
    private final DeterministicRiskEngine riskEngine;
    private final KnownThreatRepository knownThreatRepository;
    private final AnalyzedEntityRepository entityRepository;
    private final RiskAssessmentRepository assessmentRepository;
    private final RiskIndicatorRepository indicatorRepository;
    private final AssessmentIndicatorRepository assessmentIndicatorRepository;
    private final SimulatedTransactionRepository simulatedTransactionRepository;
    private final ObjectMapper objectMapper;

    public TransactionSimulationService(
            EvmRpcClient rpcClient,
            CalldataDecoder calldataDecoder,
            StateEffectAnalyzer stateEffectAnalyzer,
            DeployedContractRegistry contractRegistry,
            DeterministicRiskEngine riskEngine,
            KnownThreatRepository knownThreatRepository,
            AnalyzedEntityRepository entityRepository,
            RiskAssessmentRepository assessmentRepository,
            RiskIndicatorRepository indicatorRepository,
            AssessmentIndicatorRepository assessmentIndicatorRepository,
            SimulatedTransactionRepository simulatedTransactionRepository,
            ObjectMapper objectMapper
    ) {
        this.rpcClient = rpcClient;
        this.calldataDecoder = calldataDecoder;
        this.stateEffectAnalyzer = stateEffectAnalyzer;
        this.contractRegistry = contractRegistry;
        this.riskEngine = riskEngine;
        this.knownThreatRepository = knownThreatRepository;
        this.entityRepository = entityRepository;
        this.assessmentRepository = assessmentRepository;
        this.indicatorRepository = indicatorRepository;
        this.assessmentIndicatorRepository = assessmentIndicatorRepository;
        this.simulatedTransactionRepository = simulatedTransactionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TransactionSimulationResponse simulateTransaction(TransactionSimulationRequest request) {
        String from = request.fromAddress().trim().toLowerCase(Locale.ROOT);
        String to = request.toAddress().trim().toLowerCase(Locale.ROOT);
        String valueWei = request.valueWei();
        String calldata = request.calldata();

        // 1. Decode Calldata
        CalldataDecoder.DecodedCall decodedCall = calldataDecoder.decode(to, calldata, valueWei);

        // 2. Query Network Connectivity
        boolean rpcAvailable = rpcClient.isAvailable();
        long chainId = rpcAvailable ? rpcClient.getChainId() : contractRegistry.getChainId();
        long blockNumber = rpcAvailable ? rpcClient.getBlockNumber() : 0L;

        // 3. Execute Read-Only eth_call Simulation
        boolean isReverted = false;
        String revertReason = null;
        Long gasEstimated = null;

        if (rpcAvailable) {
            EvmRpcClient.EthCallResult callResult = rpcClient.ethCall(from, to, calldata, valueWei);
            if (!callResult.success()) {
                isReverted = true;
                revertReason = callResult.revertReason();
                log.info("Simulation dry-run reverted: {}", revertReason);
            } else {
                gasEstimated = rpcClient.estimateGas(from, to, calldata, valueWei);
                if (gasEstimated == null) gasEstimated = 46210L;
            }
        } else {
            // Offline / Demo fallback
            if (contractRegistry.isHoneypot(to)) {
                isReverted = true;
                revertReason = "HONEYPOT_DETECTED: Transfer locked by contract administrator";
            } else {
                gasEstimated = 46210L;
            }
        }

        String simulationStatus = isReverted ? "REVERTED" : "SUCCESS";

        // 4. Perform State Effect Analysis
        StateEffectResult stateEffects = stateEffectAnalyzer.analyzeEffects(
                from, to, valueWei, decodedCall, isReverted, gasEstimated
        );

        // 5. Evaluate Risk Indicators via Deterministic Engine
        boolean isThreatMatch = knownThreatRepository.existsByAddressIgnoreCase(to);
        boolean isSpenderThreatMatch = decodedCall.spenderAddress() != null &&
                (knownThreatRepository.existsByAddressIgnoreCase(decodedCall.spenderAddress())
                        || contractRegistry.isDangerousSpender(decodedCall.spenderAddress()));

        String toContractType = contractRegistry.findByAddress(to)
                .map(DeployedContractRegistry.DeployedContractInfo::type)
                .orElse("UNKNOWN");

        EvaluationResult evaluation = riskEngine.evaluateSimulatedTransaction(
                from, to, decodedCall, isReverted, revertReason, toContractType, isThreatMatch, isSpenderThreatMatch
        );

        // 6. Persist Simulation Record & Risk Assessment Audit Trail
        SimulatedTransaction simEntity = new SimulatedTransaction();
        simEntity.setFromAddress(from);
        simEntity.setToAddress(to);
        simEntity.setValueWei(valueWei);
        simEntity.setCalldataHex(calldata);
        simEntity.setGasUsed(gasEstimated != null ? gasEstimated.intValue() : 0);
        simEntity.setSimulationStatus(simulationStatus);
        simEntity.setRevertReason(revertReason);
        try {
            simEntity.setBalanceDeltasJson(objectMapper.writeValueAsString(stateEffects.tokenBalanceDeltas()));
            simEntity.setAllowanceDeltasJson(objectMapper.writeValueAsString(stateEffects.allowanceDeltas()));
        } catch (Exception e) {
            simEntity.setBalanceDeltasJson("[]");
            simEntity.setAllowanceDeltasJson("[]");
        }
        simEntity = simulatedTransactionRepository.save(simEntity);

        // Persist AnalyzedEntity & RiskAssessment
        AnalyzedEntity targetEntity = entityRepository.findByAddressIgnoreCase(to)
                .orElseGet(() -> entityRepository.save(new AnalyzedEntity(to, "TRANSACTION_TARGET", "Target_" + to.substring(0, 8), evaluation.score())));
        targetEntity.setOverallReputationScore(evaluation.score());
        targetEntity.setLastAnalyzedAt(Instant.now());
        entityRepository.save(targetEntity);

        RiskAssessment assessment = new RiskAssessment();
        assessment.setEntity(targetEntity);
        assessment.setTargetAddress(to);
        assessment.setTargetType(TargetType.TRANSACTION.name());
        assessment.setOverallScore(evaluation.score());
        assessment.setRiskCategory(evaluation.category().name());
        assessment.setSummaryExplanation(evaluation.summary());
        assessment = assessmentRepository.save(assessment);

        List<RiskIndicatorDto> indicatorDtos = new ArrayList<>();
        for (TriggeredIndicator ind : evaluation.indicators()) {
            RiskIndicator dbIndicator = indicatorRepository.findByCode(ind.code())
                    .orElseGet(() -> indicatorRepository.save(new RiskIndicator(
                            ind.code(), ind.category(), ind.title(), ind.explanation(), ind.severity().name(), ind.baseWeight()
                    )));

            AssessmentIndicator link = new AssessmentIndicator();
            link.setAssessment(assessment);
            link.setIndicator(dbIndicator);
            link.setAppliedWeight(ind.appliedWeight());
            link.setContextExplanation(ind.explanation());
            link.setEvidenceData(ind.evidence());
            assessmentIndicatorRepository.save(link);

            indicatorDtos.add(new RiskIndicatorDto(
                    ind.code(), ind.category(), ind.title(), ind.severity().name(),
                    ind.appliedWeight(), ind.explanation(), ind.evidence()
            ));
        }

        // 7. Assemble Structured Response DTOs
        DecodedCallDto decodedDto = new DecodedCallDto(
                decodedCall.methodSelector(),
                decodedCall.functionSignature(),
                decodedCall.actionType(),
                decodedCall.parameters(),
                decodedCall.isApproval(),
                decodedCall.spenderAddress(),
                decodedCall.isUnlimitedApproval(),
                decodedCall.humanInterpretation()
        );

        StateEffectsDto effectsDto = new StateEffectsDto(
                stateEffects.tokenBalanceDeltas(),
                stateEffects.allowanceDeltas(),
                stateEffects.nativeEthDelta(),
                stateEffects.projectedEvents(),
                stateEffects.summary()
        );

        RiskAssessmentResponse riskResponse = new RiskAssessmentResponse(
                assessment.getId(),
                to,
                TargetType.TRANSACTION,
                evaluation.score(),
                evaluation.category(),
                evaluation.summary(),
                RiskAssessmentResponse.STANDARD_PROTOTYPE_DISCLAIMER,
                indicatorDtos,
                evaluation.recommendations(),
                evaluation.metadata(),
                assessment.getCreatedAt()
        );

        NetworkInfoDto networkInfo = new NetworkInfoDto(
                chainId,
                rpcAvailable ? "Hardhat Local EVM" : "Local Demo Mock Mode",
                true,
                rpcAvailable,
                blockNumber,
                rpcClient.getRpcUrl()
        );

        return new TransactionSimulationResponse(
                simEntity.getId(),
                simulationStatus,
                gasEstimated,
                revertReason,
                decodedDto,
                effectsDto,
                riskResponse,
                networkInfo,
                simEntity.getSimulatedAt()
        );
    }
}
