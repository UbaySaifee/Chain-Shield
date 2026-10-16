package com.chainshield.simulation.model;

import java.math.BigInteger;

public record TokenAllowanceDelta(
        String tokenAddress,
        String tokenSymbol,
        String ownerAddress,
        String spenderAddress,
        BigInteger previousAllowance,
        BigInteger projectedAllowance,
        boolean isUnlimited,
        String humanExplanation
) {}
