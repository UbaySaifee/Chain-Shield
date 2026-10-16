package com.chainshield.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "risk_assessments")
public class RiskAssessment {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entity_id")
    private AnalyzedEntity entity;

    @Column(nullable = false, length = 42)
    private String targetAddress;

    @Column(nullable = false, length = 20)
    private String targetType; // WALLET, CONTRACT, TRANSACTION

    @Column(nullable = false)
    private int overallScore;

    @Column(nullable = false, length = 20)
    private String riskCategory; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summaryExplanation;

    @Column(columnDefinition = "TEXT")
    private String metadataJson;

    @Column(nullable = false)
    private Instant createdAt;

    public RiskAssessment() {
        this.id = UUID.randomUUID();
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public AnalyzedEntity getEntity() { return entity; }
    public void setEntity(AnalyzedEntity entity) { this.entity = entity; }

    public String getTargetAddress() { return targetAddress; }
    public void setTargetAddress(String targetAddress) { this.targetAddress = targetAddress; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public int getOverallScore() { return overallScore; }
    public void setOverallScore(int overallScore) { this.overallScore = overallScore; }

    public String getRiskCategory() { return riskCategory; }
    public void setRiskCategory(String riskCategory) { this.riskCategory = riskCategory; }

    public String getSummaryExplanation() { return summaryExplanation; }
    public void setSummaryExplanation(String summaryExplanation) { this.summaryExplanation = summaryExplanation; }

    public String getMetadataJson() { return metadataJson; }
    public void setMetadataJson(String metadataJson) { this.metadataJson = metadataJson; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
