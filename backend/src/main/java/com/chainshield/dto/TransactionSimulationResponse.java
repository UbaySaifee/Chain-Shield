package com.chainshield.dto;

import java.time.Instant;
import java.util.UUID;

public record TransactionSimulationResponse(
        UUID id,
        String simulationStatus,
        Long gasEstimated,
        String revertReason,
        DecodedCallDto decodedCall,
        StateEffectsDto stateEffects,
        RiskAssessmentResponse riskAssessment,
        NetworkInfoDto networkInfo,
        Instant timestamp
) {}
