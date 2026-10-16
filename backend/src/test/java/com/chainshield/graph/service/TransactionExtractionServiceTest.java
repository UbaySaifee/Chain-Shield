package com.chainshield.graph.service;

import com.chainshield.blockchain.decoder.CalldataDecoder;
import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class TransactionExtractionServiceTest {

    private TransactionExtractionService extractionService;
    private DeployedContractRegistry contractRegistry;
    private CalldataDecoder calldataDecoder;

    @BeforeEach
    void setUp() {
        contractRegistry = new DeployedContractRegistry(new ObjectMapper());
        contractRegistry.init();
        calldataDecoder = new CalldataDecoder(contractRegistry);
        extractionService = new TransactionExtractionService(calldataDecoder, contractRegistry);
    }

    @Test
    @DisplayName("Should successfully decode standard ERC-20 Transfer log")
    void testDecodeTransferLogSuccess() {
        String token = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        List<String> topics = List.of(
                TransactionExtractionService.ERC20_TRANSFER_TOPIC,
                "0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8", // from
                "0x0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc"  // to
        );
        // 100 * 10^18 tokens in hex: 0x056bc75e2d63100000
        String dataHex = "0x0000000000000000000000000000000000000000000000056bc75e2d63100000";

        Optional<TransactionExtractionService.DecodedTransferEvent> result =
                extractionService.decodeTransferLog(token, topics, dataHex, "0x123", 10L);

        assertTrue(result.isPresent());
        assertEquals("0x70997970c51812dc3a010c7d01b50e0d17dc79c8", result.get().from());
        assertEquals("0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", result.get().to());
        assertEquals(new BigDecimal("100.000000"), result.get().amount());
        assertEquals(token.toLowerCase(), result.get().tokenContract());
    }

    @Test
    @DisplayName("Should gracefully return empty for malformed or unsupported logs")
    void testDecodeTransferLogMalformed() {
        // Unsupported topic0
        Optional<TransactionExtractionService.DecodedTransferEvent> notTransfer =
                extractionService.decodeTransferLog("0x123", List.of("0xabc"), "0x0", "0x1", 1L);
        assertTrue(notTransfer.isEmpty());

        // Less than 3 topics
        Optional<TransactionExtractionService.DecodedTransferEvent> missingTopics =
                extractionService.decodeTransferLog("0x123", List.of(TransactionExtractionService.ERC20_TRANSFER_TOPIC), "0x0", "0x1", 1L);
        assertTrue(missingTopics.isEmpty());

        // Empty topics
        Optional<TransactionExtractionService.DecodedTransferEvent> emptyTopics =
                extractionService.decodeTransferLog("0x123", List.of(), "0x0", "0x1", 1L);
        assertTrue(emptyTopics.isEmpty());
    }

    @Test
    @DisplayName("Should decode ERC-20 Approval log with unlimited threshold check")
    void testDecodeApprovalLog() {
        String token = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        List<String> topics = List.of(
                TransactionExtractionService.ERC20_APPROVAL_TOPIC,
                "0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8",
                "0x0000000000000000000000005fc8d32690cc91d4c39d9d3abcbd16989f875707"
        );
        // MAX_UINT256
        String dataHex = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

        Optional<TransactionExtractionService.DecodedApprovalEvent> result =
                extractionService.decodeApprovalLog(token, topics, dataHex, "0x456", 12L);

        assertTrue(result.isPresent());
        assertEquals("0x70997970c51812dc3a010c7d01b50e0d17dc79c8", result.get().owner());
        assertEquals("0x5fc8d32690cc91d4c39d9d3abcbd16989f875707", result.get().spender());
        assertTrue(result.get().isUnlimited());
    }

    @Test
    @DisplayName("Should decode contract call through CalldataDecoder")
    void testDecodeContractCall() {
        // Calldata for approve(0x5FC8d32690cc91D4c39d9d3abcBD16989F875707, MAX_UINT256)
        String calldata = "0x095ea7b3"
                + "0000000000000000000000005fc8d32690cc91d4c39d9d3abcbd16989f875707"
                + "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

        CalldataDecoder.DecodedCall call = extractionService.decodeContractCall(
                "0x5FbDB2315678afecb367f032d93F642f64180aa3",
                calldata,
                "0"
        );

        assertNotNull(call);
        assertTrue(call.isApproval());
        assertTrue(call.isUnlimitedApproval());
        assertEquals("0x5fc8d32690cc91d4c39d9d3abcbd16989f875707", call.spenderAddress());
    }
}
