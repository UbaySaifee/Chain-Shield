package com.chainshield.domain;

public enum Severity {
    INFO(0.2),
    LOW(0.5),
    MEDIUM(1.0),
    HIGH(1.5),
    CRITICAL(2.0);

    private final double multiplier;

    Severity(double multiplier) {
        this.multiplier = multiplier;
    }

    public double getMultiplier() {
        return multiplier;
    }
}
