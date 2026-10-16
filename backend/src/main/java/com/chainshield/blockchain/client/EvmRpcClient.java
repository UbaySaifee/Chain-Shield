package com.chainshield.blockchain.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Robust JSON-RPC 2.0 client for interacting with the local Hardhat EVM node.
 * Uses standard java.net.http.HttpClient with configurable timeout and zero external dependencies.
 */
@Component
public class EvmRpcClient {

    private static final Logger log = LoggerFactory.getLogger(EvmRpcClient.class);

    private final String rpcUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    private static final Pattern REVERT_REASON_PATTERN = Pattern.compile("reverted with reason string '([^']+)'");
    private static final Pattern REVERT_CUSTOM_PATTERN = Pattern.compile("reverted with custom error '([^']+)'");

    public EvmRpcClient(
            @Value("${chainshield.evm.rpc-url:http://127.0.0.1:8545}") String rpcUrl,
            ObjectMapper objectMapper
    ) {
        this.rpcUrl = rpcUrl;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    public String getRpcUrl() {
        return rpcUrl;
    }

    /**
     * Checks if the EVM RPC node is reachable and responsive.
     */
    public boolean isAvailable() {
        try {
            JsonNode response = sendRpcRequest("eth_chainId", Collections.emptyList());
            return response != null && response.has("result");
        } catch (Exception e) {
            log.warn("EvmRpcClient isAvailable check failed against {}: {} ({})", rpcUrl, e.getMessage(), e.getClass().getName());
            return false;
        }
    }

    /**
     * Returns the detected chain ID.
     */
    public long getChainId() {
        try {
            JsonNode res = sendRpcRequest("eth_chainId", Collections.emptyList());
            if (res != null && res.has("result")) {
                String hex = res.get("result").asText();
                return parseHexToLong(hex);
            }
        } catch (Exception e) {
            log.debug("Failed to query eth_chainId from {}: {}", rpcUrl, e.getMessage());
        }
        return 31337L; // Default local Hardhat devnet
    }

    /**
     * Returns the current block number.
     */
    public long getBlockNumber() {
        try {
            JsonNode res = sendRpcRequest("eth_blockNumber", Collections.emptyList());
            if (res != null && res.has("result")) {
                return parseHexToLong(res.get("result").asText());
            }
        } catch (Exception e) {
            log.debug("Failed to query eth_blockNumber: {}", e.getMessage());
        }
        return 0L;
    }

    /**
     * Returns the bytecode at a given address.
     */
    public String getCode(String address) {
        try {
            JsonNode res = sendRpcRequest("eth_getCode", List.of(normalizeAddress(address), "latest"));
            if (res != null && res.has("result")) {
                return res.get("result").asText();
            }
        } catch (Exception e) {
            log.debug("Failed to query eth_getCode for {}: {}", address, e.getMessage());
        }
        return "0x";
    }

    /**
     * Returns native ETH balance in Wei.
     */
    public BigInteger getBalance(String address) {
        try {
            JsonNode res = sendRpcRequest("eth_getBalance", List.of(normalizeAddress(address), "latest"));
            if (res != null && res.has("result")) {
                String hex = res.get("result").asText();
                return parseHexToBigInteger(hex);
            }
        } catch (Exception e) {
            log.debug("Failed to query eth_getBalance for {}: {}", address, e.getMessage());
        }
        return BigInteger.ZERO;
    }

    /**
     * Returns the transaction count (nonce) for an account.
     */
    public long getTransactionCount(String address) {
        try {
            JsonNode res = sendRpcRequest("eth_getTransactionCount", List.of(normalizeAddress(address), "latest"));
            if (res != null && res.has("result")) {
                return parseHexToLong(res.get("result").asText());
            }
        } catch (Exception e) {
            log.debug("Failed to query eth_getTransactionCount for {}: {}", address, e.getMessage());
        }
        return 0L;
    }

    /**
     * Queries event logs matching the specified address, block range, and topics.
     */
    public JsonNode getLogs(String address, String fromBlock, String toBlock, List<String> topics) {
        Map<String, Object> filter = new HashMap<>();
        if (address != null && !address.isBlank()) {
            filter.put("address", normalizeAddress(address));
        }
        filter.put("fromBlock", fromBlock != null ? fromBlock : "0x0");
        filter.put("toBlock", toBlock != null ? toBlock : "latest");
        if (topics != null && !topics.isEmpty()) {
            filter.put("topics", topics);
        }
        try {
            JsonNode res = sendRpcRequest("eth_getLogs", List.of(filter));
            if (res != null && res.has("result")) {
                return res.get("result");
            }
        } catch (Exception e) {
            log.debug("Failed to query eth_getLogs: {}", e.getMessage());
        }
        return null;
    }


    /**
     * Performs a read-only eth_call simulation.
     */
    public EthCallResult ethCall(String from, String to, String calldata, String valueWei) {
        Map<String, Object> txObj = new HashMap<>();
        if (from != null && !from.isBlank()) {
            txObj.put("from", normalizeAddress(from));
        }
        if (to != null && !to.isBlank()) {
            txObj.put("to", normalizeAddress(to));
        }
        txObj.put("data", (calldata != null && !calldata.isBlank()) ? calldata : "0x");
        if (valueWei != null && !valueWei.isBlank() && !valueWei.equals("0")) {
            txObj.put("value", "0x" + new BigInteger(valueWei).toString(16));
        }

        try {
            JsonNode res = sendRpcRequest("eth_call", List.of(txObj, "latest"));
            if (res == null) {
                return new EthCallResult(false, null, "RPC connection failed or timed out", "NO_RESPONSE");
            }

            if (res.has("result")) {
                String returnData = res.get("result").asText();
                return new EthCallResult(true, returnData, null, null);
            } else if (res.has("error")) {
                JsonNode errorNode = res.get("error");
                String rawMsg = errorNode.has("message") ? errorNode.get("message").asText() : "Execution reverted";
                String decodedReason = extractRevertReason(errorNode);
                return new EthCallResult(false, null, decodedReason, rawMsg);
            }
        } catch (Exception e) {
            return new EthCallResult(false, null, e.getMessage(), e.getClass().getSimpleName());
        }

        return new EthCallResult(false, null, "Unknown simulation failure", "UNKNOWN");
    }

    /**
     * Estimates gas for transaction execution.
     */
    public Long estimateGas(String from, String to, String calldata, String valueWei) {
        Map<String, Object> txObj = new HashMap<>();
        if (from != null && !from.isBlank()) {
            txObj.put("from", normalizeAddress(from));
        }
        if (to != null && !to.isBlank()) {
            txObj.put("to", normalizeAddress(to));
        }
        txObj.put("data", (calldata != null && !calldata.isBlank()) ? calldata : "0x");
        if (valueWei != null && !valueWei.isBlank() && !valueWei.equals("0")) {
            txObj.put("value", "0x" + new BigInteger(valueWei).toString(16));
        }

        try {
            JsonNode res = sendRpcRequest("eth_estimateGas", List.of(txObj));
            if (res != null && res.has("result")) {
                return parseHexToLong(res.get("result").asText());
            }
        } catch (Exception e) {
            log.debug("Gas estimation failed: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Retrieves the on-chain receipt for a transaction hash.
     */
    public JsonNode getTransactionReceipt(String txHash) {
        if (txHash == null || !txHash.startsWith("0x")) return null;
        try {
            JsonNode res = sendRpcRequest("eth_getTransactionReceipt", List.of(txHash));
            if (res != null && res.has("result") && !res.get("result").isNull()) {
                return res.get("result");
            }
        } catch (Exception e) {
            log.debug("Failed to query eth_getTransactionReceipt for {}: {}", txHash, e.getMessage());
        }
        return null;
    }

    /**
     * Retrieves the transaction details for a transaction hash.
     */
    public JsonNode getTransactionByHash(String txHash) {
        if (txHash == null || !txHash.startsWith("0x")) return null;
        try {
            JsonNode res = sendRpcRequest("eth_getTransactionByHash", List.of(txHash));
            if (res != null && res.has("result") && !res.get("result").isNull()) {
                return res.get("result");
            }
        } catch (Exception e) {
            log.debug("Failed to query eth_getTransactionByHash for {}: {}", txHash, e.getMessage());
        }
        return null;
    }

    /**
     * Reads a 32-byte storage slot value from an EVM contract at a specific position.
     * Useful for checking EIP-1967 implementation and admin slots.
     */
    public String getStorageAt(String address, String position) {
        if (address == null || !address.startsWith("0x")) {
            return "0x0000000000000000000000000000000000000000000000000000000000000000";
        }
        try {
            JsonNode res = sendRpcRequest("eth_getStorageAt", List.of(normalizeAddress(address), position, "latest"));
            if (res != null && res.has("result")) {
                return res.get("result").asText();
            }
        } catch (Exception e) {
            log.debug("Failed to query eth_getStorageAt for {} at {}: {}", address, position, e.getMessage());
        }
        return "0x0000000000000000000000000000000000000000000000000000000000000000";
    }

    public JsonNode sendRpcRequest(String method, List<?> params) throws Exception {
        Map<String, Object> payload = Map.of(
                "jsonrpc", "2.0",
                "method", method,
                "params", params != null ? params : Collections.emptyList(),
                "id", 1
        );

        String json = objectMapper.writeValueAsString(payload);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(rpcUrl))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(3))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readTree(response.body());
    }

    /**
     * Decodes the human-readable revert reason from JSON-RPC error payload.
     */
    public String extractRevertReason(JsonNode errorNode) {
        if (errorNode == null) return "Execution reverted";

        String message = errorNode.has("message") ? errorNode.get("message").asText() : "";

        // 1. Regex match for reason string in message
        Matcher matcher = REVERT_REASON_PATTERN.matcher(message);
        if (matcher.find()) {
            return matcher.group(1);
        }

        Matcher customMatcher = REVERT_CUSTOM_PATTERN.matcher(message);
        if (customMatcher.find()) {
            return customMatcher.group(1);
        }

        // 2. Inspect embedded error data
        String errorDataHex = null;
        if (errorNode.has("data")) {
            JsonNode dataNode = errorNode.get("data");
            if (dataNode.isTextual()) {
                errorDataHex = dataNode.asText();
            } else if (dataNode.has("data")) {
                errorDataHex = dataNode.get("data").asText();
            }
        }

        if (errorDataHex != null && errorDataHex.startsWith("0x")) {
            String decoded = decodeRevertData(errorDataHex);
            if (decoded != null && !decoded.isBlank()) {
                return decoded;
            }
        }

        // 3. Fallback to cleaned message string
        if (message.contains("reverted")) {
            return message.replace("Error: VM Exception while processing transaction: ", "").trim();
        }

        return !message.isBlank() ? message : "Execution reverted with unknown error";
    }

    /**
     * Decodes standard ABI Error(string) selector 0x08c379a0 or Panic(uint256) selector 0x4e487b71.
     */
    public static String decodeRevertData(String hexData) {
        if (hexData == null || hexData.length() < 10) return null;
        String clean = hexData.startsWith("0x") ? hexData.substring(2) : hexData;

        // Selector 08c379a0 -> Error(string)
        if (clean.startsWith("08c379a0") && clean.length() >= 136) {
            try {
                // Offset is at [8, 72], length is at [72, 136]
                int length = Integer.parseInt(clean.substring(72, 136), 16);
                int stringEndHex = 136 + (length * 2);
                if (clean.length() >= stringEndHex) {
                    byte[] bytes = hexStringToByteArray(clean.substring(136, stringEndHex));
                    return new String(bytes, StandardCharsets.UTF_8).trim();
                }
            } catch (Exception e) {
                // Ignore parse failure
            }
        }

        // Selector 4e487b71 -> Panic(uint256)
        if (clean.startsWith("4e487b71") && clean.length() >= 72) {
            try {
                int panicCode = Integer.parseInt(clean.substring(8, 72), 16);
                return "Panic(0x" + Integer.toHexString(panicCode) + "): " + getPanicDescription(panicCode);
            } catch (Exception e) {
                // Ignore
            }
        }

        return null;
    }

    private static String getPanicDescription(int code) {
        return switch (code) {
            case 0x01 -> "Assert evaluated to false";
            case 0x11 -> "Arithmetic operation overflowed or underflowed";
            case 0x12 -> "Division or modulo by zero";
            case 0x21 -> "Enum conversion out of bounds";
            case 0x22 -> "Incorrectly encoded storage byte array";
            case 0x31 -> "Pop on empty array";
            case 0x32 -> "Array index out of bounds";
            case 0x41 -> "Memory allocation exceeded";
            case 0x51 -> "Call to uninitialized internal function pointer";
            default -> "EVM internal panic";
        };
    }

    private static byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                    + Character.digit(s.charAt(i + 1), 16));
        }
        return data;
    }

    private static long parseHexToLong(String hex) {
        String clean = hex.startsWith("0x") ? hex.substring(2) : hex;
        return clean.isEmpty() ? 0L : Long.parseLong(clean, 16);
    }

    private static BigInteger parseHexToBigInteger(String hex) {
        String clean = hex.startsWith("0x") ? hex.substring(2) : hex;
        return clean.isEmpty() ? BigInteger.ZERO : new BigInteger(clean, 16);
    }

    private static String normalizeAddress(String addr) {
        return addr != null ? addr.trim().toLowerCase(Locale.ROOT) : "";
    }

    public record EthCallResult(
            boolean success,
            String returnData,
            String revertReason,
            String rawError
    ) {}
}
