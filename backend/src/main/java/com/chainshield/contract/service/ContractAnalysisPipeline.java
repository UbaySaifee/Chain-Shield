package com.chainshield.contract.service;

import com.chainshield.contract.model.*;
import com.chainshield.domain.RiskCategory;
import com.chainshield.domain.TargetType;
import com.chainshield.dto.ContractAnalysisResponse;
import com.chainshield.dto.RiskIndicatorDto;
import com.chainshield.entity.AnalyzedEntity;
import com.chainshield.entity.AssessmentIndicator;
import com.chainshield.entity.RiskAssessment;
import com.chainshield.entity.RiskIndicator;
import com.chainshield.repository.AnalyzedEntityRepository;
import com.chainshield.repository.AssessmentIndicatorRepository;
import com.chainshield.repository.RiskAssessmentRepository;
import com.chainshield.repository.RiskIndicatorRepository;
import com.chainshield.service.risk.DeterministicRiskEngine;
import com.chainshield.domain.EvaluationResult;
import com.chainshield.domain.TriggeredIndicator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Enterprise pipeline orchestrating end-to-end smart contract security analysis.
 * Implements Milestone 5 Requirement 1:
 * Contract Discovery -> Metadata & ABI -> Permissions -> Capabilities -> Bytecode Heuristics -> Threat Intel -> Risk Engine -> Explainable Report.
 */
@Service
public class ContractAnalysisPipeline {

    private static final Logger log = LoggerFactory.getLogger(ContractAnalysisPipeline.class);

    private final ContractDiscoveryService discoveryService;
    private final ContractAbiMetadataService abiMetadataService;
    private final ContractPermissionAnalyzer permissionAnalyzer;
    private final ContractCapabilityAnalyzer capabilityAnalyzer;
    private final ContractBytecodeAnalyzer bytecodeAnalyzer;
    private final ContractThreatIntelligenceService threatIntelligenceService;
    private final DeterministicRiskEngine riskEngine;
    private final AnalyzedEntityRepository entityRepository;
    private final RiskAssessmentRepository assessmentRepository;
    private final RiskIndicatorRepository indicatorRepository;
    private final AssessmentIndicatorRepository assessmentIndicatorRepository;
    private final ObjectMapper objectMapper;

    public ContractAnalysisPipeline(
            ContractDiscoveryService discoveryService,
            ContractAbiMetadataService abiMetadataService,
            ContractPermissionAnalyzer permissionAnalyzer,
            ContractCapabilityAnalyzer capabilityAnalyzer,
            ContractBytecodeAnalyzer bytecodeAnalyzer,
            ContractThreatIntelligenceService threatIntelligenceService,
            DeterministicRiskEngine riskEngine,
            AnalyzedEntityRepository entityRepository,
            RiskAssessmentRepository assessmentRepository,
            RiskIndicatorRepository indicatorRepository,
            AssessmentIndicatorRepository assessmentIndicatorRepository,
            ObjectMapper objectMapper
    ) {
        this.discoveryService = discoveryService;
        this.abiMetadataService = abiMetadataService;
        this.permissionAnalyzer = permissionAnalyzer;
        this.capabilityAnalyzer = capabilityAnalyzer;
        this.bytecodeAnalyzer = bytecodeAnalyzer;
        this.threatIntelligenceService = threatIntelligenceService;
        this.riskEngine = riskEngine;
        this.entityRepository = entityRepository;
        this.assessmentRepository = assessmentRepository;
        this.indicatorRepository = indicatorRepository;
        this.assessmentIndicatorRepository = assessmentIndicatorRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ContractAnalysisResponse analyzeContract(String rawAddress, Integer chainId) {
        String address = rawAddress.trim().toLowerCase(Locale.ROOT);
        String networkDisplay = "LOCAL_DEMO_NETWORK (Chain ID: " + (chainId != null ? chainId : 31337) + ")";

        // Step 1: Contract Discovery
        ContractDiscoveryService.DiscoveryResult discovery = discoveryService.discover(address);

        // Case A: Address is an EOA (Externally Owned Account)
        if (discovery.classification() == AccountClassification.EOA) {
            log.info("Address {} detected as EOA (Externally Owned Account) with zero deployed bytecode.", address);
            return handleEoaAddress(address, networkDisplay);
        }

        // Step 2: Metadata and ABI Analysis
        var metadataResult = abiMetadataService.getMetadata(
                address,
                discovery.bytecodeSizeBytes(),
                discovery.rawBytecode()
        );

        // Step 3: Ownership and Permission Analysis
        var permissionResult = permissionAnalyzer.analyze(
                address,
                metadataResult.abiInfo().functions()
        );

        // Step 4: Behavioral Capability Detection
        List<CapabilityDto> capabilities = capabilityAnalyzer.analyzeCapabilities(
                metadataResult.abiInfo().functions(),
                metadataResult.isErc20()
        );

        // Step 5: Bytecode Heuristic Analysis
        var bytecodeResult = bytecodeAnalyzer.analyzeBytecode(
                address,
                discovery.rawBytecode()
        );

        // Step 6: Threat Intelligence Check
        var threatResult = threatIntelligenceService.checkThreatIntelligence(address);

        // Step 7: Risk Engine Evaluation
        boolean isTradingLocked = metadataResult.isTradingLocked();
        boolean hasBlacklist = metadataResult.hasBlacklist();
        boolean hasOwnerOnlyMint = metadataResult.hasOwnerOnlyMint();
        boolean hasDangerousDrain = metadataResult.hasDangerousSpenderPattern() || metadataResult.hasOwnerOnlyDrain();
        boolean hasPause = capabilities.stream().anyMatch(c -> "PAUSE_CONTROL".equals(c.name()));

        EvaluationResult evaluation = riskEngine.evaluateContractDetails(
                address,
                metadataResult.metadata().name(),
                discovery.isContract(),
                discovery.bytecodeSizeBytes(),
                "LOCAL_VERIFIED".equals(metadataResult.metadata().sourceStatus()),
                isTradingLocked,
                hasBlacklist,
                hasOwnerOnlyMint,
                hasDangerousDrain,
                bytecodeResult.hasDelegateCall(),
                bytecodeResult.hasSelfDestruct(),
                bytecodeResult.isProxyOrForwarder(),
                permissionResult.hasPrivilegedControl(),
                hasPause,
                threatResult.isMatch(),
                threatResult.description()
        );

        // Step 8: Persist Assessment and Indicators in Database
        RiskAssessment persistedAssessment = persistAssessment(address, TargetType.CONTRACT, evaluation, metadataResult.metadata().name());
        List<RiskIndicatorDto> indicatorDtos = persistIndicators(persistedAssessment, evaluation.indicators());

        // Step 9: Assemble Comprehensive Explainable Response
        return new ContractAnalysisResponse(
                persistedAssessment.getId(),
                address,
                TargetType.CONTRACT,
                evaluation.score(),
                evaluation.category(),
                evaluation.summary(),
                ContractAnalysisResponse.STANDARD_PROTOTYPE_DISCLAIMER,
                indicatorDtos,
                evaluation.recommendations(),
                evaluation.metadata(),
                persistedAssessment.getCreatedAt(),
                address,
                networkDisplay,
                AccountClassification.CONTRACT,
                true,
                metadataResult.metadata(),
                permissionResult.ownershipInfo(),
                permissionResult.adminInfo(),
                bytecodeResult.proxyInfo(),
                metadataResult.abiInfo(),
                capabilities,
                ContractAnalysisResponse.STANDARD_LIMITATIONS
        );
    }

    private ContractAnalysisResponse handleEoaAddress(String address, String networkDisplay) {
        EvaluationResult evaluation = new EvaluationResult(
                0,
                RiskCategory.LOW,
                "LOW RISK (0/100): Address is an Externally Owned Account (EOA), not a smart contract. No smart contract bytecode is deployed at this address.",
                List.of(),
                List.of(
                        "Address is an individual wallet account (EOA). No smart contract bytecode exists.",
                        "Use the Wallet Risk Analyzer for transaction volume and counterparty forensics."
                ),
                Map.of("isContract", false, "accountType", "EOA")
        );

        RiskAssessment persisted = persistAssessment(address, TargetType.CONTRACT, evaluation, "EOA Account");

        ContractMetadataDto eoaMetadata = new ContractMetadataDto(
                "Externally Owned Account (EOA)",
                "",
                null,
                null,
                false,
                0,
                "SOURCE_UNAVAILABLE",
                false,
                "0x",
                "N/A (EOA)",
                "N/A"
        );

        OwnershipInfoDto eoaOwnership = new OwnershipInfoDto(
                false,
                "N/A (EOA has private key holder, not contract owner)",
                "Individual Keypair",
                List.of(),
                "Externally Owned Accounts are controlled by their respective private keyholders. Contract ownership rules do not apply."
        );

        AdminInfoDto eoaAdmin = new AdminInfoDto(
                false,
                "None",
                false,
                List.of(),
                "Account is an EOA with no contract admin roles."
        );

        ProxyInfoDto eoaProxy = new ProxyInfoDto(
                "NO",
                "None",
                "None",
                "Not detected",
                "None (EOA)",
                false
        );

        AbiInfoDto eoaAbi = new AbiInfoDto(
                false,
                "EOA (No Contract ABI)",
                0,
                0,
                List.of(),
                List.of(),
                List.of("EOA")
        );

        return new ContractAnalysisResponse(
                persisted.getId(),
                address,
                TargetType.CONTRACT,
                0,
                RiskCategory.LOW,
                evaluation.summary(),
                ContractAnalysisResponse.STANDARD_PROTOTYPE_DISCLAIMER,
                List.of(),
                evaluation.recommendations(),
                evaluation.metadata(),
                persisted.getCreatedAt(),
                address,
                networkDisplay,
                AccountClassification.EOA,
                false,
                eoaMetadata,
                eoaOwnership,
                eoaAdmin,
                eoaProxy,
                eoaAbi,
                List.of(),
                ContractAnalysisResponse.STANDARD_LIMITATIONS
        );
    }

    private RiskAssessment persistAssessment(String address, TargetType type, EvaluationResult evaluation, String label) {
        AnalyzedEntity entity = entityRepository.findByAddressIgnoreCase(address)
                .orElseGet(() -> new AnalyzedEntity(
                        address,
                        type.name(),
                        label,
                        evaluation.score()
                ));
        entity.setOverallReputationScore(evaluation.score());
        entity.setLastAnalyzedAt(Instant.now());
        entity = entityRepository.save(entity);

        RiskAssessment assessment = new RiskAssessment();
        assessment.setEntity(entity);
        assessment.setTargetAddress(address);
        assessment.setTargetType(type.name());
        assessment.setOverallScore(evaluation.score());
        assessment.setRiskCategory(evaluation.category().name());
        assessment.setSummaryExplanation(evaluation.summary());

        try {
            assessment.setMetadataJson(objectMapper.writeValueAsString(evaluation.metadata()));
        } catch (Exception e) {
            log.debug("Failed to serialize metadata for {}: {}", address, e.getMessage());
        }

        return assessmentRepository.save(assessment);
    }

    private List<RiskIndicatorDto> persistIndicators(RiskAssessment assessment, List<TriggeredIndicator> indicators) {
        List<RiskIndicatorDto> result = new ArrayList<>();

        for (TriggeredIndicator ind : indicators) {
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

            result.add(new RiskIndicatorDto(
                    ind.code(),
                    ind.category(),
                    ind.title(),
                    ind.severity().name(),
                    ind.appliedWeight(),
                    ind.explanation(),
                    ind.evidence()
            ));
        }

        return result;
    }
}
