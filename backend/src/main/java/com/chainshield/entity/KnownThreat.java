package com.chainshield.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "known_threats")
public class KnownThreat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 42)
    private String address;

    @Column(nullable = false, length = 50)
    private String threatType; // PHISHING_DRAINER, HONEYPOT, MIXER, RANSOMWARE

    @Column(nullable = false, length = 100)
    private String sourceFeed;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private int confidenceLevel;

    @Column(nullable = false)
    private Instant reportedAt;

    public KnownThreat() {
        this.reportedAt = Instant.now();
        this.confidenceLevel = 100;
    }

    public KnownThreat(String address, String threatType, String sourceFeed, String description, int confidenceLevel) {
        this();
        this.address = address;
        this.threatType = threatType;
        this.sourceFeed = sourceFeed;
        this.description = description;
        this.confidenceLevel = confidenceLevel;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getThreatType() { return threatType; }
    public void setThreatType(String threatType) { this.threatType = threatType; }

    public String getSourceFeed() { return sourceFeed; }
    public void setSourceFeed(String sourceFeed) { this.sourceFeed = sourceFeed; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public int getConfidenceLevel() { return confidenceLevel; }
    public void setConfidenceLevel(int confidenceLevel) { this.confidenceLevel = confidenceLevel; }

    public Instant getReportedAt() { return reportedAt; }
    public void setReportedAt(Instant reportedAt) { this.reportedAt = reportedAt; }
}
