package com.chainshield.blockchain.decoder;

import com.chainshield.blockchain.registry.DeployedContractRegistry;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.util.*;

/**
 * Decodes ABI calldata into strongly-typed parameter maps and human-readable explanations.
 * Supports standard ERC-20 functions and custom ChainShield testbed contract interfaces.
 */
@Component
public class CalldataDecoder {

    private final DeployedContractRegistry contractRegistry;

    public static final BigInteger MAX_UINT256 = new BigInteger("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", 16);
    public static final BigInteger HIGH_APPROVAL_THRESHOLD = new BigInteger("1000000000000000000000000000"); // 1 Billion tokens

    public CalldataDecoder(DeployedContractRegistry contractRegistry) {
        this.contractRegistry = contractRegistry;
    }

    public DecodedCall decode(String targetContract, String calldata, String valueWei) {
        String cleanData = (calldata != null && calldata.startsWith("0x")) ? calldata.substring(2) : (calldata != null ? calldata : "");
        String selector = cleanData.length() >= 8 ? "0x" + cleanData.substring(0, 8).toLowerCase(Locale.ROOT) : "0x";

        Optional<DeployedContractRegistry.DeployedContractInfo> contractOpt = contractRegistry.findByAddress(targetContract);
        String tokenSymbol = contractOpt.map(DeployedContractRegistry.DeployedContractInfo::symbol).filter(s -> !s.isBlank()).orElse("TOKEN");
        int decimals = contractOpt.map(DeployedContractRegistry.DeployedContractInfo::decimals).orElse(18);

        // Native ETH Transfer (empty calldata or value > 0 with no selector)
        if (cleanData.isEmpty() || cleanData.length() < 8) {
            BigInteger value = parseBigInteger(valueWei);
            String formattedValue = formatEther(value);
            return new DecodedCall(
                    "0x",
                    "native_eth_transfer()",
                    "Native ETH Transfer",
                    Map.of("valueEth", formattedValue, "valueWei", value.toString()),
                    false,
                    null,
                    false,
                    value,
                    "Send " + formattedValue + " ETH directly to " + (targetContract != null ? targetContract : "destination")
            );
        }

        try {
            switch (selector) {
                // ERC-20: approve(address spender, uint256 amount)
                case "0x095ea7b3" -> {
                    String spender = parseAddressParam(cleanData, 0);
                    BigInteger amount = parseUint256Param(cleanData, 1);
                    boolean isUnlimited = isUnlimitedAmount(cleanData, amount);
                    String amountFormatted = isUnlimited ? "UNLIMITED (MAX_UINT256)" : formatTokenAmount(amount, decimals, tokenSymbol);

                    String interpretation = isUnlimited
                            ? String.format("Authorize spender %s to spend UNLIMITED %s on your behalf.", spender, tokenSymbol)
                            : String.format("Authorize spender %s to spend %s on your behalf.", spender, amountFormatted);

                    return new DecodedCall(
                            selector,
                            "approve(address,uint256)",
                            "ERC-20 Token Approval",
                            Map.of("spender", spender, "amountRaw", amount.toString(), "amountFormatted", amountFormatted, "isUnlimited", isUnlimited),
                            true,
                            spender,
                            isUnlimited,
                            amount,
                            interpretation
                    );
                }

                // ERC-20: transfer(address to, uint256 amount)
                case "0xa9059cbb" -> {
                    String recipient = parseAddressParam(cleanData, 0);
                    BigInteger amount = parseUint256Param(cleanData, 1);
                    String amountFormatted = formatTokenAmount(amount, decimals, tokenSymbol);

                    return new DecodedCall(
                            selector,
                            "transfer(address,uint256)",
                            "ERC-20 Token Transfer",
                            Map.of("recipient", recipient, "amountRaw", amount.toString(), "amountFormatted", amountFormatted),
                            false,
                            null,
                            false,
                            amount,
                            String.format("Transfer %s to recipient %s.", amountFormatted, recipient)
                    );
                }

                // ERC-20: transferFrom(address from, address to, uint256 amount)
                case "0x23b872dd" -> {
                    String from = parseAddressParam(cleanData, 0);
                    String to = parseAddressParam(cleanData, 1);
                    BigInteger amount = parseUint256Param(cleanData, 2);
                    String amountFormatted = formatTokenAmount(amount, decimals, tokenSymbol);

                    return new DecodedCall(
                            selector,
                            "transferFrom(address,address,uint256)",
                            "ERC-20 Delegated Transfer",
                            Map.of("from", from, "to", to, "amountRaw", amount.toString(), "amountFormatted", amountFormatted),
                            false,
                            null,
                            false,
                            amount,
                            String.format("Transfer %s from %s to %s using prior allowance grant.", amountFormatted, from, to)
                    );
                }

                // SafeVault: deposit(uint256 amount)
                case "0xb6b55f25" -> {
                    BigInteger amount = parseUint256Param(cleanData, 0);
                    String amountFormatted = formatTokenAmount(amount, decimals, tokenSymbol);
                    return new DecodedCall(
                            selector,
                            "deposit(uint256)",
                            "SafeVault Deposit",
                            Map.of("amountRaw", amount.toString(), "amountFormatted", amountFormatted),
                            false,
                            null,
                            false,
                            amount,
                            String.format("Deposit %s into SafeVault audited escrow contract.", amountFormatted)
                    );
                }

                // SafeVault: withdraw(uint256 amount)
                case "0x2e1a7d4d" -> {
                    BigInteger amount = parseUint256Param(cleanData, 0);
                    String amountFormatted = formatTokenAmount(amount, decimals, tokenSymbol);
                    return new DecodedCall(
                            selector,
                            "withdraw(uint256)",
                            "SafeVault Withdrawal",
                            Map.of("amountRaw", amount.toString(), "amountFormatted", amountFormatted),
                            false,
                            null,
                            false,
                            amount,
                            String.format("Withdraw %s from SafeVault escrow to your wallet.", amountFormatted)
                    );
                }

                // HoneypotToken: setTradingLocked(bool locked)
                case "0xa1021799" -> {
                    boolean locked = parseBoolParam(cleanData, 0);
                    return new DecodedCall(
                            selector,
                            "setTradingLocked(bool)",
                            "Honeypot Admin Control",
                            Map.of("locked", locked),
                            false,
                            null,
                            false,
                            BigInteger.ZERO,
                            String.format("Modify Honeypot token trading restriction status to: %s.", locked ? "LOCKED (Non-owner transfers fail)" : "UNLOCKED")
                    );
                }

                // DangerousApprovalSpender: drainVictim(address token, address victim)
                case "0x40c10f19" -> {
                    String to = parseAddressParam(cleanData, 0);
                    BigInteger amount = parseUint256Param(cleanData, 1);
                    return new DecodedCall(
                            selector,
                            "mint(address,uint256)",
                            "Token Mint",
                            Map.of("to", to, "amountRaw", amount.toString()),
                            false,
                            null,
                            false,
                            amount,
                            String.format("Mint %s new %s tokens to %s.", formatTokenAmount(amount, decimals, tokenSymbol), tokenSymbol, to)
                    );
                }
            }
        } catch (Exception e) {
            // Graceful fallback on parameter parse error
        }

        // Generic fallback for unknown or non-standard calls
        return new DecodedCall(
                selector,
                "unknown(" + (cleanData.length() / 2) + " bytes)",
                "Contract Method Call",
                Map.of("selector", selector, "dataLengthBytes", cleanData.length() / 2),
                false,
                null,
                false,
                BigInteger.ZERO,
                String.format("Execute smart contract method with selector %s and %d bytes of calldata.", selector, cleanData.length() / 2)
        );
    }

    private String parseAddressParam(String cleanHex, int paramIndex) {
        int start = 8 + (paramIndex * 64);
        int end = start + 64;
        if (cleanHex.length() < end) return "0x0000000000000000000000000000000000000000";
        String chunk = cleanHex.substring(start, end);
        // Address occupies the rightmost 40 characters (20 bytes) of the 32-byte word
        return "0x" + chunk.substring(24).toLowerCase(Locale.ROOT);
    }

    private BigInteger parseUint256Param(String cleanHex, int paramIndex) {
        int start = 8 + (paramIndex * 64);
        int end = start + 64;
        if (cleanHex.length() < end) return BigInteger.ZERO;
        String chunk = cleanHex.substring(start, end);
        return new BigInteger(chunk, 16);
    }

    private boolean parseBoolParam(String cleanHex, int paramIndex) {
        BigInteger val = parseUint256Param(cleanHex, paramIndex);
        return !val.equals(BigInteger.ZERO);
    }

    private boolean isUnlimitedAmount(String cleanHex, BigInteger amount) {
        if (amount.compareTo(HIGH_APPROVAL_THRESHOLD) > 0) return true;
        // Check raw hex for max pattern
        if (cleanHex.length() >= 136) {
            String amountHex = cleanHex.substring(72, 136).toLowerCase(Locale.ROOT);
            return amountHex.startsWith("ffffffff") || amountHex.equals("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        }
        return false;
    }

    public static String formatTokenAmount(BigInteger rawWei, int decimals, String symbol) {
        if (rawWei == null || rawWei.equals(BigInteger.ZERO)) {
            return "0.0 " + symbol;
        }
        BigDecimal rawDec = new BigDecimal(rawWei);
        BigDecimal divisor = BigDecimal.TEN.pow(decimals);
        BigDecimal formatted = rawDec.divide(divisor, 4, RoundingMode.HALF_UP).stripTrailingZeros();
        return formatted.toPlainString() + " " + symbol;
    }

    public static String formatEther(BigInteger wei) {
        if (wei == null || wei.equals(BigInteger.ZERO)) return "0.0";
        BigDecimal eth = new BigDecimal(wei).divide(BigDecimal.TEN.pow(18), 6, RoundingMode.HALF_UP).stripTrailingZeros();
        return eth.toPlainString();
    }

    private BigInteger parseBigInteger(String val) {
        if (val == null || val.isBlank()) return BigInteger.ZERO;
        try {
            return val.startsWith("0x") ? new BigInteger(val.substring(2), 16) : new BigInteger(val);
        } catch (Exception e) {
            return BigInteger.ZERO;
        }
    }

    public record DecodedCall(
            String methodSelector,
            String functionSignature,
            String actionType,
            Map<String, Object> parameters,
            boolean isApproval,
            String spenderAddress,
            boolean isUnlimitedApproval,
            BigInteger primaryAmount,
            String humanInterpretation
    ) {}
}
