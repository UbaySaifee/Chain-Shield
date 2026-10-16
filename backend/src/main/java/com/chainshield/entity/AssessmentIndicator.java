package com.chainshield.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "assessment_indicators")
public class AssessmentIndicator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private RiskAssessment assessment;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "indicator_id", nullable = false)
    private RiskIndicator indicator;

    @Column(nullable = false)
    private int appliedWeight;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contextExplanation;

    @Column(columnDefinition = "TEXT")
    private String evidenceData;

    public AssessmentIndicator() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public RiskAssessment getAssessment() { return assessment; }
    public void setAssessment(RiskAssessment assessment) { this.assessment = assessment; }

    public RiskIndicator getIndicator() { return indicator; }
    public void setIndicator(RiskIndicator indicator) { this.indicator = indicator; }

    public int getAppliedWeight() { return appliedWeight; }
    public void setAppliedWeight(int appliedWeight) { this.appliedWeight = appliedWeight; }

    public String getContextExplanation() { return contextExplanation; }
    public void setContextExplanation(String contextExplanation) { this.contextExplanation = contextExplanation; }

    public String getEvidenceData() { return evidenceData; }
    public void setEvidenceData(String evidenceData) { this.evidenceData = evidenceData; }
}
