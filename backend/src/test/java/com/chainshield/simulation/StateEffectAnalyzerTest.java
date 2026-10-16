package com.chainshield.simulation;

import com.chainshield.blockchain.client.EvmRpcClient;
import com.chainshield.blockchain.decoder.CalldataDecoder;
import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.chainshield.simulation.model.StateEffectResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.util.Collections;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class StateEffectAnalyzerTest {

    private EvmRpcClient rpcClient;
    private DeployedContractRegistry contractRegistry;
    private StateEffectAnalyzer analyzer;

    private final String mockTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    private final String testUserAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    private final String demoRecipientAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

    static class FakeRpcClient extends EvmRpcClient {
        public FakeRpcClient() {
            super("http://127.0.0.1:8545", new ObjectMapper());
        }

        @Override
        public boolean isAvailable() {
            return false;
        }
    }

    @BeforeEach
    void setUp() {
        rpcClient = new FakeRpcClient();
        contractRegistry = new DeployedContractRegistry(new ObjectMapper());
        contractRegistry.init();

        analyzer = new StateEffectAnalyzer(rpcClient, contractRegistry);
    }

    @Test
    @DisplayName("Supported ERC-20 transfer produces both FROM negative delta and TO positive delta")
    void testStandardErc20TransferBothSides() {
        BigInteger amount250 = new BigInteger("250000000000000000000"); // 250 * 10^18

        CalldataDecoder.DecodedCall decodedCall = new CalldataDecoder.DecodedCall(
                "0xa9059cbb",
                "transfer(address,uint256)",
                "ERC-20 Token Transfer",
                Map.of("recipient", demoRecipientAddress, "amount", amount250),
                false,
                null,
                false,
                amount250,
                "Transfer 250 SHLD to recipient"
        );

        StateEffectResult result = analyzer.analyzeEffects(
                testUserAddress,
                mockTokenAddress,
                "0",
                decodedCall,
                false,
                52000L
        );

        assertEquals(2, result.tokenBalanceDeltas().size(), "Must produce deltas for both FROM and TO");

        // Sender delta
        var fromDelta = result.tokenBalanceDeltas().get(0);
        assertEquals(testUserAddress, fromDelta.accountAddress());
        assertTrue(fromDelta.formattedDelta().contains("-250"), "Sender delta must be negative: " + fromDelta.formattedDelta());

        // Recipient delta
        var toDelta = result.tokenBalanceDeltas().get(1);
        assertEquals(demoRecipientAddress, toDelta.accountAddress());
        assertTrue(toDelta.formattedDelta().contains("+250"), "Recipient delta must be positive: " + toDelta.formattedDelta());

        // Event log
        assertEquals(1, result.projectedEvents().size());
        assertTrue(result.projectedEvents().get(0).contains("Transfer"));
        assertTrue(result.projectedEvents().get(0).contains(testUserAddress));
        assertTrue(result.projectedEvents().get(0).contains(demoRecipientAddress));
    }

    @Test
    @DisplayName("Self-transfer avoids duplicate entries and records net zero balance change")
    void testSelfTransferHandling() {
        BigInteger amount250 = new BigInteger("250000000000000000000");

        CalldataDecoder.DecodedCall decodedCall = new CalldataDecoder.DecodedCall(
                "0xa9059cbb",
                "transfer(address,uint256)",
                "ERC-20 Token Transfer",
                Map.of("recipient", testUserAddress, "amount", amount250),
                false,
                null,
                false,
                amount250,
                "Self transfer"
        );

        StateEffectResult result = analyzer.analyzeEffects(
                testUserAddress,
                mockTokenAddress,
                "0",
                decodedCall,
                false,
                25000L
        );

        assertEquals(1, result.tokenBalanceDeltas().size(), "Self-transfer must not duplicate accounts");
        var delta = result.tokenBalanceDeltas().get(0);
        assertEquals(testUserAddress, delta.accountAddress());
        assertEquals("0.0 SHLD", delta.formattedDelta());
        assertTrue(result.summary().contains("Self-transfer"));
    }

    @Test
    @DisplayName("Zero-address transfer is treated as a token burn")
    void testZeroAddressTransferBurn() {
        BigInteger amount250 = new BigInteger("250000000000000000000");
        String zeroAddress = "0x0000000000000000000000000000000000000000";

        CalldataDecoder.DecodedCall decodedCall = new CalldataDecoder.DecodedCall(
                "0xa9059cbb",
                "transfer(address,uint256)",
                "ERC-20 Token Transfer",
                Map.of("recipient", zeroAddress, "amount", amount250),
                false,
                null,
                false,
                amount250,
                "Burn transfer"
        );

        StateEffectResult result = analyzer.analyzeEffects(
                testUserAddress,
                mockTokenAddress,
                "0",
                decodedCall,
                false,
                25000L
        );

        assertTrue(result.summary().contains("Token burn"));
    }

    @Test
    @DisplayName("Unsupported contract method is explicitly marked as UNSUPPORTED OPERATION rather than guessed")
    void testUnsupportedMethodNotGuessed() {
        CalldataDecoder.DecodedCall decodedCall = new CalldataDecoder.DecodedCall(
                "0x12345678",
                "customUnknownMethod(bytes32)",
                "Custom Execution",
                Collections.emptyMap(),
                false,
                null,
                false,
                null,
                "Unknown custom method"
        );

        StateEffectResult result = analyzer.analyzeEffects(
                testUserAddress,
                mockTokenAddress,
                "0",
                decodedCall,
                false,
                21000L
        );

        assertTrue(result.tokenBalanceDeltas().isEmpty(), "Unsupported methods should not guess balance deltas");
        assertTrue(result.allowanceDeltas().isEmpty(), "Unsupported methods should not guess allowance deltas");
        assertTrue(result.summary().startsWith("UNSUPPORTED OPERATION"), "Must be explicitly marked as unsupported");
    }

    @Test
    @DisplayName("Reverted transaction records no state changes")
    void testRevertedTransactionNoStateChange() {
        CalldataDecoder.DecodedCall decodedCall = new CalldataDecoder.DecodedCall(
                "0xa9059cbb",
                "transfer(address,uint256)",
                "ERC-20 Token Transfer",
                Map.of("recipient", demoRecipientAddress),
                false,
                null,
                false,
                BigInteger.valueOf(100),
                "Transfer"
        );

        StateEffectResult result = analyzer.analyzeEffects(
                testUserAddress,
                mockTokenAddress,
                "0",
                decodedCall,
                true, // isReverted
                null
        );

        assertTrue(result.tokenBalanceDeltas().isEmpty());
        assertTrue(result.allowanceDeltas().isEmpty());
        assertTrue(result.summary().contains("reverted"));
    }
}
