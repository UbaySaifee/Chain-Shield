package com.chainshield.graph.service;

import com.chainshield.blockchain.decoder.CalldataDecoder;
import com.chainshield.blockchain.decoder.CalldataDecoder.DecodedCall;
import com.chainshield.blockchain.registry.DeployedContractRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Service for decoding ERC-20 event logs and contract calldata into normalized graph relationships.
 * Implements Milestone 6 Requirements 5 and 6.
 */
@Service
public class TransactionExtractionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionExtractionService.class);

    // ERC-20 Transfer(address,address,uint256)
    public static final String ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    // ERC-20 Approval(address,address,uint256)
    public static final String ERC20_APPROVAL_TOPIC = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

    private final CalldataDecoder calldataDecoder;
    private final DeployedContractRegistry contractRegistry;

    public TransactionExtractionService(CalldataDecoder calldataDecoder, DeployedContractRegistry contractRegistry) {
        this.calldataDecoder = calldataDecoder;
        this.contractRegistry = contractRegistry;
    }

    /**
     * Decodes an ERC-20 Transfer event log.
     * Safely handles unknown tokens, malformed topics/data, or non-ERC20 logs.
     */
    public Optional<DecodedTransferEvent> decodeTransferLog(
            String tokenAddress,
            List<String> topics,
            String dataHex,
            String txHash,
            Long blockNumber
    ) {
        if (topics == null || topics.isEmpty()) {
            return Optional.empty();
        }

        String topic0 = topics.get(0).toLowerCase(Locale.ROOT);
        if (!ERC20_TRANSFER_TOPIC.equalsIgnoreCase(topic0)) {
            return Optional.empty();
        }

        if (topics.size() < 3) {
            log.debug("Malformed Transfer event: expected at least 3 topics, got {}", topics.size());
            return Optional.empty();
        }

        try {
            String from = extractAddressFromTopic(topics.get(1));
            String to = extractAddressFromTopic(topics.get(2));

            BigInteger rawVal = BigInteger.ZERO;
            if (dataHex != null && !dataHex.isBlank() && !dataHex.equals("0x")) {
                String cleanData = dataHex.startsWith("0x") ? dataHex.substring(2) : dataHex;
                if (!cleanData.isEmpty()) {
                    rawVal = new BigInteger(cleanData, 16);
                }
            }

            int decimals = 18;
            String symbol = "TOKEN";
            if (tokenAddress != null) {
                Optional<DeployedContractRegistry.DeployedContractInfo> contractInfo = contractRegistry.findByAddress(tokenAddress);
                if (contractInfo.isPresent()) {
                    decimals = contractInfo.get().decimals();
                    symbol = contractInfo.get().symbol();
                }
            }

            BigDecimal amount = new BigDecimal(rawVal).divide(BigDecimal.TEN.pow(decimals), 6, RoundingMode.HALF_UP);

            return Optional.of(new DecodedTransferEvent(
                    from,
                    to,
                    tokenAddress != null ? tokenAddress.toLowerCase(Locale.ROOT) : "",
                    symbol,
                    amount,
                    rawVal.toString(),
                    txHash,
                    blockNumber
            ));
        } catch (Exception e) {
            log.debug("Failed to decode Transfer log for tx {}: {}", txHash, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Decodes an ERC-20 Approval event log.
     */
    public Optional<DecodedApprovalEvent> decodeApprovalLog(
            String tokenAddress,
            List<String> topics,
            String dataHex,
            String txHash,
            Long blockNumber
    ) {
        if (topics == null || topics.isEmpty()) {
            return Optional.empty();
        }

        String topic0 = topics.get(0).toLowerCase(Locale.ROOT);
        if (!ERC20_APPROVAL_TOPIC.equalsIgnoreCase(topic0)) {
            return Optional.empty();
        }

        if (topics.size() < 3) {
            return Optional.empty();
        }

        try {
            String owner = extractAddressFromTopic(topics.get(1));
            String spender = extractAddressFromTopic(topics.get(2));

            BigInteger rawVal = BigInteger.ZERO;
            if (dataHex != null && !dataHex.isBlank() && !dataHex.equals("0x")) {
                String cleanData = dataHex.startsWith("0x") ? dataHex.substring(2) : dataHex;
                if (!cleanData.isEmpty()) {
                    rawVal = new BigInteger(cleanData, 16);
                }
            }

            boolean isUnlimited = rawVal.compareTo(CalldataDecoder.HIGH_APPROVAL_THRESHOLD) >= 0;

            int decimals = 18;
            String symbol = "TOKEN";
            if (tokenAddress != null) {
                Optional<DeployedContractRegistry.DeployedContractInfo> contractInfo = contractRegistry.findByAddress(tokenAddress);
                if (contractInfo.isPresent()) {
                    decimals = contractInfo.get().decimals();
                    symbol = contractInfo.get().symbol();
                }
            }

            BigDecimal amount = new BigDecimal(rawVal).divide(BigDecimal.TEN.pow(decimals), 6, RoundingMode.HALF_UP);

            return Optional.of(new DecodedApprovalEvent(
                    owner,
                    spender,
                    tokenAddress != null ? tokenAddress.toLowerCase(Locale.ROOT) : "",
                    symbol,
                    amount,
                    isUnlimited,
                    txHash,
                    blockNumber
            ));
        } catch (Exception e) {
            log.debug("Failed to decode Approval log: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Reuses CalldataDecoder for contract call extraction.
     */
    public DecodedCall decodeContractCall(String targetContract, String calldata, String valueWei) {
        return calldataDecoder.decode(targetContract, calldata, valueWei);
    }

    private String extractAddressFromTopic(String topic) {
        if (topic == null) return "0x0000000000000000000000000000000000000000";
        String clean = topic.startsWith("0x") ? topic.substring(2) : topic;
        if (clean.length() >= 40) {
            return "0x" + clean.substring(clean.length() - 40).toLowerCase(Locale.ROOT);
        }
        return "0x" + clean.toLowerCase(Locale.ROOT);
    }

    public record DecodedTransferEvent(
            String from,
            String to,
            String tokenContract,
            String tokenSymbol,
            BigDecimal amount,
            String rawAmount,
            String txHash,
            Long blockNumber
    ) {}

    public record DecodedApprovalEvent(
            String owner,
            String spender,
            String tokenContract,
            String tokenSymbol,
            BigDecimal amount,
            boolean isUnlimited,
            String txHash,
            Long blockNumber
    ) {}
}
