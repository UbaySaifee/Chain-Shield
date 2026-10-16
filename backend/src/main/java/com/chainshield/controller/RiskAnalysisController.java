package com.chainshield.controller;

import com.chainshield.dto.*;
import com.chainshield.service.RiskAnalysisService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping
public class RiskAnalysisController {

    private final RiskAnalysisService riskAnalysisService;

    public RiskAnalysisController(RiskAnalysisService riskAnalysisService) {
        this.riskAnalysisService = riskAnalysisService;
    }

    /**
     * Analyze an EVM wallet address.
     * Supports both /api/wallet/analyze and /api/v1/analyze/wallet for spec alignment.
     */
    @PostMapping({"/api/wallet/analyze", "/api/v1/analyze/wallet"})
    public ResponseEntity<RiskAssessmentResponse> analyzeWallet(
            @Valid @RequestBody WalletAnalysisRequest request
    ) {
        return ResponseEntity.ok(riskAnalysisService.analyzeWallet(request));
    }

    /**
     * Analyze an EVM smart contract address.
     */
    @PostMapping({"/api/contract/analyze", "/api/v1/analyze/contract"})
    public ResponseEntity<ContractAnalysisResponse> analyzeContract(
            @Valid @RequestBody ContractAnalysisRequest request
    ) {
        return ResponseEntity.ok(riskAnalysisService.analyzeContract(request));
    }

    /**
     * Analyze a candidate transaction payload before signing.
     */
    @PostMapping({"/api/transaction/analyze", "/api/v1/analyze/transaction"})
    public ResponseEntity<RiskAssessmentResponse> analyzeTransaction(
            @Valid @RequestBody TransactionAnalysisRequest request
    ) {
        return ResponseEntity.ok(riskAnalysisService.analyzeTransaction(request));
    }

    /**
     * Retrieve analysis history, with optional type filtering (e.g. ?type=CONTRACT).
     */
    @GetMapping({"/api/analyses", "/api/v1/analyses"})
    public ResponseEntity<List<AnalysisSummaryDto>> getAnalysisHistory(
            @RequestParam(required = false) String type
    ) {
        return ResponseEntity.ok(riskAnalysisService.getAnalysisHistory(type));
    }


    /**
     * Retrieve a specific analysis assessment by UUID.
     */
    @GetMapping({"/api/analyses/{id}", "/api/v1/analyses/{id}"})
    public ResponseEntity<RiskAssessmentResponse> getAnalysisById(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(riskAnalysisService.getAnalysisById(id));
    }
}
