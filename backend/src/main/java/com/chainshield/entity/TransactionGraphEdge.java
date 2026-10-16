package com.chainshield.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "transaction_graph_edges")
public class TransactionGraphEdge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 42)
    private String fromAddress;

    @Column(nullable = false, length = 42)
    private String toAddress;

    @Column(nullable = false, length = 66)
    private String txHash;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal valueEth;

    @Column(nullable = false, length = 20)
    private String tokenSymbol;

    @Column(nullable = false, length = 30)
    private String relationshipType; // TRANSFER, APPROVAL, CONTRACT_CALL

    @Column(nullable = false)
    private Instant blockTimestamp;

    @Column
    private Long blockNumber;

    @Column(length = 42)
    private String tokenAddress;

    @Column(length = 78)
    private String tokenAmount;

    @Column(length = 100)
    private String functionName;

    @Column(length = 50)
    private String network;

    public TransactionGraphEdge() {
        this.blockTimestamp = Instant.now();
        this.valueEth = BigDecimal.ZERO;
        this.tokenSymbol = "ETH";
        this.network = "LOCAL_DEMO_NETWORK";
        this.blockNumber = 0L;
    }

    public TransactionGraphEdge(
            String fromAddress,
            String toAddress,
            String txHash,
            BigDecimal valueEth,
            String tokenSymbol,
            String relationshipType,
            Instant blockTimestamp,
            Long blockNumber,
            String tokenAddress,
            String tokenAmount,
            String functionName,
            String network
    ) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.txHash = txHash;
        this.valueEth = valueEth != null ? valueEth : BigDecimal.ZERO;
        this.tokenSymbol = tokenSymbol != null ? tokenSymbol : "ETH";
        this.relationshipType = relationshipType;
        this.blockTimestamp = blockTimestamp != null ? blockTimestamp : Instant.now();
        this.blockNumber = blockNumber != null ? blockNumber : 0L;
        this.tokenAddress = tokenAddress;
        this.tokenAmount = tokenAmount;
        this.functionName = functionName;
        this.network = network != null ? network : "LOCAL_DEMO_NETWORK";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFromAddress() { return fromAddress; }
    public void setFromAddress(String fromAddress) { this.fromAddress = fromAddress; }

    public String getToAddress() { return toAddress; }
    public void setToAddress(String toAddress) { this.toAddress = toAddress; }

    public String getTxHash() { return txHash; }
    public void setTxHash(String txHash) { this.txHash = txHash; }

    public BigDecimal getValueEth() { return valueEth; }
    public void setValueEth(BigDecimal valueEth) { this.valueEth = valueEth; }

    public String getTokenSymbol() { return tokenSymbol; }
    public void setTokenSymbol(String tokenSymbol) { this.tokenSymbol = tokenSymbol; }

    public String getRelationshipType() { return relationshipType; }
    public void setRelationshipType(String relationshipType) { this.relationshipType = relationshipType; }

    public Instant getBlockTimestamp() { return blockTimestamp; }
    public void setBlockTimestamp(Instant blockTimestamp) { this.blockTimestamp = blockTimestamp; }

    public Long getBlockNumber() { return blockNumber; }
    public void setBlockNumber(Long blockNumber) { this.blockNumber = blockNumber; }

    public String getTokenAddress() { return tokenAddress; }
    public void setTokenAddress(String tokenAddress) { this.tokenAddress = tokenAddress; }

    public String getTokenAmount() { return tokenAmount; }
    public void setTokenAmount(String tokenAmount) { this.tokenAmount = tokenAmount; }

    public String getFunctionName() { return functionName; }
    public void setFunctionName(String functionName) { this.functionName = functionName; }

    public String getNetwork() { return network; }
    public void setNetwork(String network) { this.network = network; }
}

