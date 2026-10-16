package com.chainshield.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "simulated_transactions")
public class SimulatedTransaction {

    @Id
    private UUID id;

    @Column(nullable = false, length = 42)
    private String fromAddress;

    @Column(nullable = false, length = 42)
    private String toAddress;

    @Column(nullable = false, length = 78)
    private String valueWei;

    @Column(columnDefinition = "TEXT")
    private String calldataHex;

    private Integer gasUsed;

    @Column(nullable = false, length = 20)
    private String simulationStatus; // SUCCESS, REVERTED, FAILED

    @Column(columnDefinition = "TEXT")
    private String revertReason;

    @Column(columnDefinition = "TEXT")
    private String balanceDeltasJson;

    @Column(columnDefinition = "TEXT")
    private String allowanceDeltasJson;

    @Column(nullable = false)
    private Instant simulatedAt;

    public SimulatedTransaction() {
        this.id = UUID.randomUUID();
        this.simulatedAt = Instant.now();
        this.valueWei = "0";
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getFromAddress() { return fromAddress; }
    public void setFromAddress(String fromAddress) { this.fromAddress = fromAddress; }

    public String getToAddress() { return toAddress; }
    public void setToAddress(String toAddress) { this.toAddress = toAddress; }

    public String getValueWei() { return valueWei; }
    public void setValueWei(String valueWei) { this.valueWei = valueWei; }

    public String getCalldataHex() { return calldataHex; }
    public void setCalldataHex(String calldataHex) { this.calldataHex = calldataHex; }

    public Integer getGasUsed() { return gasUsed; }
    public void setGasUsed(Integer gasUsed) { this.gasUsed = gasUsed; }

    public String getSimulationStatus() { return simulationStatus; }
    public void setSimulationStatus(String simulationStatus) { this.simulationStatus = simulationStatus; }

    public String getRevertReason() { return revertReason; }
    public void setRevertReason(String revertReason) { this.revertReason = revertReason; }

    public String getBalanceDeltasJson() { return balanceDeltasJson; }
    public void setBalanceDeltasJson(String balanceDeltasJson) { this.balanceDeltasJson = balanceDeltasJson; }

    public String getAllowanceDeltasJson() { return allowanceDeltasJson; }
    public void setAllowanceDeltasJson(String allowanceDeltasJson) { this.allowanceDeltasJson = allowanceDeltasJson; }

    public Instant getSimulatedAt() { return simulatedAt; }
    public void setSimulatedAt(Instant simulatedAt) { this.simulatedAt = simulatedAt; }
}
