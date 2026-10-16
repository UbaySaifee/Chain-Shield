package com.chainshield.simulation.model;

import java.math.BigInteger;

public record TokenBalanceDelta(
        String tokenAddress,
        String tokenSymbol,
        String accountAddress,
        BigInteger previousBalance,
        BigInteger projectedBalance,
        BigInteger delta,
        String formattedDelta
) {}
