package com.chainshield.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "risk_indicators")
public class RiskIndicator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 20)
    private String severity; // INFO, LOW, MEDIUM, HIGH, CRITICAL

    @Column(nullable = false)
    private int defaultWeight;

    public RiskIndicator() {}

    public RiskIndicator(String code, String category, String title, String description, String severity, int defaultWeight) {
        this.code = code;
        this.category = category;
        this.title = title;
        this.description = description;
        this.severity = severity;
        this.defaultWeight = defaultWeight;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public int getDefaultWeight() { return defaultWeight; }
    public void setDefaultWeight(int defaultWeight) { this.defaultWeight = defaultWeight; }
}
