package com.chainshield.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "analyzed_entities")
public class AnalyzedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 42)
    private String address;

    @Column(nullable = false, length = 20)
    private String entityType; // WALLET, CONTRACT, UNKNOWN

    @Column(length = 100)
    private String label;

    @Column(nullable = false)
    private int overallReputationScore;

    @Column(nullable = false)
    private Instant firstSeenAt;

    @Column(nullable = false)
    private Instant lastAnalyzedAt;

    public AnalyzedEntity() {
        this.firstSeenAt = Instant.now();
        this.lastAnalyzedAt = Instant.now();
    }

    public AnalyzedEntity(String address, String entityType, String label, int overallReputationScore) {
        this();
        this.address = address;
        this.entityType = entityType;
        this.label = label;
        this.overallReputationScore = overallReputationScore;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public int getOverallReputationScore() { return overallReputationScore; }
    public void setOverallReputationScore(int overallReputationScore) { this.overallReputationScore = overallReputationScore; }

    public Instant getFirstSeenAt() { return firstSeenAt; }
    public void setFirstSeenAt(Instant firstSeenAt) { this.firstSeenAt = firstSeenAt; }

    public Instant getLastAnalyzedAt() { return lastAnalyzedAt; }
    public void setLastAnalyzedAt(Instant lastAnalyzedAt) { this.lastAnalyzedAt = lastAnalyzedAt; }
}
