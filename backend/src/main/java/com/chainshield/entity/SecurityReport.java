package com.chainshield.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "security_reports")
public class SecurityReport {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id")
    private RiskAssessment assessment;

    @Column(nullable = false, length = 42)
    private String targetAddress;

    @Column(nullable = false, length = 20)
    private String riskCategory;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String executiveSummary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String fullReportPayload;

    @Column(nullable = false)
    private Instant generatedAt;

    public SecurityReport() {
        this.id = UUID.randomUUID();
        this.generatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public RiskAssessment getAssessment() { return assessment; }
    public void setAssessment(RiskAssessment assessment) { this.assessment = assessment; }

    public String getTargetAddress() { return targetAddress; }
    public void setTargetAddress(String targetAddress) { this.targetAddress = targetAddress; }

    public String getRiskCategory() { return riskCategory; }
    public void setRiskCategory(String riskCategory) { this.riskCategory = riskCategory; }

    public String getExecutiveSummary() { return executiveSummary; }
    public void setExecutiveSummary(String executiveSummary) { this.executiveSummary = executiveSummary; }

    public String getFullReportPayload() { return fullReportPayload; }
    public void setFullReportPayload(String fullReportPayload) { this.fullReportPayload = fullReportPayload; }

    public Instant getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(Instant generatedAt) { this.generatedAt = generatedAt; }
}
