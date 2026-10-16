package com.chainshield.simulation.model;

import java.util.Collections;
import java.util.List;

public record StateEffectResult(
        List<TokenBalanceDelta> tokenBalanceDeltas,
        List<TokenAllowanceDelta> allowanceDeltas,
        String nativeEthDelta,
        List<String> projectedEvents,
        String summary
) {
    public static StateEffectResult empty(String reason) {
        return new StateEffectResult(
                Collections.emptyList(),
                Collections.emptyList(),
                "0.0 ETH",
                Collections.emptyList(),
                reason
        );
    }
}
