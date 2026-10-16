package com.chainshield.domain;

public enum RiskCategory {
    LOW(0, 29),
    MEDIUM(30, 59),
    HIGH(60, 84),
    CRITICAL(85, 100);

    private final int minScore;
    private final int maxScore;

    RiskCategory(int minScore, int maxScore) {
        this.minScore = minScore;
        this.maxScore = maxScore;
    }

    public int getMinScore() {
        return minScore;
    }

    public int getMaxScore() {
        return maxScore;
    }

    public static RiskCategory fromScore(int score) {
        int bounded = Math.max(0, Math.min(100, score));
        for (RiskCategory category : values()) {
            if (bounded >= category.minScore && bounded <= category.maxScore) {
                return category;
            }
        }
        return LOW;
    }
}
