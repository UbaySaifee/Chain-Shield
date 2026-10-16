package com.chainshield.graph.service;

import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.chainshield.entity.TransactionGraphEdge;
import com.chainshield.repository.TransactionGraphEdgeRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Seeds deterministic transaction relationships for the local Hardhat demo environment.
 * Implements Milestone 6 Requirement 3 & 18.
 */
@Service
public class DemoTransactionGraphSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoTransactionGraphSeeder.class);

    private final TransactionGraphEdgeRepository edgeRepository;
    private final DeployedContractRegistry contractRegistry;

    // Hardhat Deterministic Test Accounts
    public static final String DEPLOYER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    public static final String WALLET_A = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Test User
    public static final String WALLET_B = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Counterparty
    public static final String WALLET_C = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"; // Tertiary Account

    public DemoTransactionGraphSeeder(
            TransactionGraphEdgeRepository edgeRepository,
            DeployedContractRegistry contractRegistry
    ) {
        this.edgeRepository = edgeRepository;
        this.contractRegistry = contractRegistry;
    }

    @PostConstruct
    @Transactional
    public void seedInitialGraphIfEmpty() {
        if (edgeRepository.count() == 0) {
            log.info("Transaction graph repository is empty. Seeding deterministic Milestone 6 demonstration topology...");
            seedDemoDataset();
        }
    }

    @Transactional
    public void seedDemoDataset() {
        String mockErc20 = contractRegistry.getAddressForContract("MockERC20")
                .orElse("0x5FbDB2315678afecb367f032d93F642f64180aa3");
        String safeVault = contractRegistry.getAddressForContract("SafeVault")
                .orElse("0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0");
        String honeypot = contractRegistry.getAddressForContract("HoneypotToken")
                .orElse("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
        String drainer = contractRegistry.getAddressForContract("DangerousApprovalSpender")
                .orElse("0x5FC8d32690cc91D4c39d9d3abcBD16989F875707");

        Instant baseTime = Instant.now().minus(2, ChronoUnit.HOURS);

        List<TransactionGraphEdge> demoEdges = List.of(
                // 1. Deployer funds Wallet A with native ETH
                new TransactionGraphEdge(
                        DEPLOYER,
                        WALLET_A,
                        "0x4a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a01",
                        new BigDecimal("100.000000"),
                        "ETH",
                        "SENT_NATIVE",
                        baseTime.plus(5, ChronoUnit.MINUTES),
                        1L,
                        null,
                        null,
                        "transfer",
                        "LOCAL_DEMO_NETWORK"
                ),

                // 2. Wallet A transfers native ETH to Wallet B
                new TransactionGraphEdge(
                        WALLET_A,
                        WALLET_B,
                        "0x5b9c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0102",
                        new BigDecimal("5.000000"),
                        "ETH",
                        "SENT_NATIVE",
                        baseTime.plus(15, ChronoUnit.MINUTES),
                        2L,
                        null,
                        null,
                        "transfer",
                        "LOCAL_DEMO_NETWORK"
                ),

                // 3. Wallet A transfers 250 SHLD tokens to MockERC20 contract interaction / recipient
                new TransactionGraphEdge(
                        WALLET_A,
                        mockErc20,
                        "0x6c0d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a010203",
                        BigDecimal.ZERO,
                        "SHLD",
                        "TOKEN_TRANSFER",
                        baseTime.plus(25, ChronoUnit.MINUTES),
                        3L,
                        mockErc20,
                        "250.0",
                        "transfer(address,uint256)",
                        "LOCAL_DEMO_NETWORK"
                ),

                // 4. Wallet A deposits ETH/tokens into SafeVault
                new TransactionGraphEdge(
                        WALLET_A,
                        safeVault,
                        "0x7d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a01020304",
                        new BigDecimal("2.500000"),
                        "ETH",
                        "CONTRACT_INTERACTION",
                        baseTime.plus(35, ChronoUnit.MINUTES),
                        4L,
                        null,
                        null,
                        "deposit()",
                        "LOCAL_DEMO_NETWORK"
                ),

                // 5. Wallet B transfers native ETH to Wallet C
                new TransactionGraphEdge(
                        WALLET_B,
                        WALLET_C,
                        "0x8e2f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0102030405",
                        new BigDecimal("1.200000"),
                        "ETH",
                        "SENT_NATIVE",
                        baseTime.plus(45, ChronoUnit.MINUTES),
                        5L,
                        null,
                        null,
                        "transfer",
                        "LOCAL_DEMO_NETWORK"
                ),

                // 6. Wallet B grants token approval to DangerousApprovalSpender
                new TransactionGraphEdge(
                        WALLET_B,
                        drainer,
                        "0x9f3a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a010203040506",
                        BigDecimal.ZERO,
                        "SHLD",
                        "CONTRACT_INTERACTION",
                        baseTime.plus(55, ChronoUnit.MINUTES),
                        6L,
                        mockErc20,
                        "UNLIMITED",
                        "approve(address,uint256)",
                        "LOCAL_DEMO_NETWORK"
                ),

                // 7. Wallet C transfers SHLD tokens
                new TransactionGraphEdge(
                        WALLET_C,
                        mockErc20,
                        "0xa04b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a01020304050607",
                        BigDecimal.ZERO,
                        "SHLD",
                        "TOKEN_TRANSFER",
                        baseTime.plus(65, ChronoUnit.MINUTES),
                        7L,
                        mockErc20,
                        "50.0",
                        "transfer(address,uint256)",
                        "LOCAL_DEMO_NETWORK"
                ),

                // 8. Deployer deploys / transfers HoneypotToken
                new TransactionGraphEdge(
                        DEPLOYER,
                        honeypot,
                        "0xb15c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0102030405060708",
                        BigDecimal.ZERO,
                        "TRAP",
                        "CONTRACT_INTERACTION",
                        baseTime.plus(75, ChronoUnit.MINUTES),
                        8L,
                        honeypot,
                        "1000000.0",
                        "setTradingOpen(bool)",
                        "LOCAL_DEMO_NETWORK"
                ),

                // 9. Wallet A interacts with HoneypotToken (attempted transfer / lock trigger)
                new TransactionGraphEdge(
                        WALLET_A,
                        honeypot,
                        "0xc26d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a010203040506070809",
                        BigDecimal.ZERO,
                        "TRAP",
                        "CONTRACT_INTERACTION",
                        baseTime.plus(85, ChronoUnit.MINUTES),
                        9L,
                        honeypot,
                        "100.0",
                        "transfer(address,uint256)",
                        "LOCAL_DEMO_NETWORK"
                )
        );

        edgeRepository.saveAll(demoEdges);
        log.info("Successfully seeded {} deterministic demonstration graph edges.", demoEdges.size());
    }
}
