package com.chainshield.dto;

import com.chainshield.simulation.model.TokenAllowanceDelta;
import com.chainshield.simulation.model.TokenBalanceDelta;

import java.util.List;

public record StateEffectsDto(
        List<TokenBalanceDelta> balanceDeltas,
        List<TokenAllowanceDelta> allowanceDeltas,
        String nativeEthDelta,
        List<String> projectedEvents,
        String summary
) {}
