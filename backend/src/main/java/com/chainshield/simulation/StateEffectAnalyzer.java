package com.chainshield.simulation;

import com.chainshield.blockchain.client.EvmRpcClient;
import com.chainshield.blockchain.decoder.CalldataDecoder;
import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.chainshield.simulation.model.StateEffectResult;
import com.chainshield.simulation.model.TokenAllowanceDelta;
import com.chainshield.simulation.model.TokenBalanceDelta;
import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.util.*;

/**
 * Analyzes pre-execution vs projected post-execution state changes on the local EVM.
 * Answers: "What is expected to change if this transaction is signed and executed?"
 */
@Component
public class StateEffectAnalyzer {

    private final EvmRpcClient rpcClient;
    private final DeployedContractRegistry contractRegistry;

    public StateEffectAnalyzer(EvmRpcClient rpcClient, DeployedContractRegistry contractRegistry) {
        this.rpcClient = rpcClient;
        this.contractRegistry = contractRegistry;
    }

    public StateEffectResult analyzeEffects(
            String from,
            String to,
            String valueWei,
            CalldataDecoder.DecodedCall decodedCall,
            boolean isReverted,
            Long gasEstimated
    ) {
        if (isReverted) {
            return new StateEffectResult(
                    Collections.emptyList(),
                    Collections.emptyList(),
                    "0.0 ETH (Reverted: No State Change)",
                    Collections.emptyList(),
                    "Transaction execution reverted during simulation. No token balances or contract allowances were altered."
            );
        }

        List<TokenBalanceDelta> balanceDeltas = new ArrayList<>();
        List<TokenAllowanceDelta> allowanceDeltas = new ArrayList<>();
        List<String> projectedEvents = new ArrayList<>();

        Optional<DeployedContractRegistry.DeployedContractInfo> contractOpt = contractRegistry.findByAddress(to);
        String tokenSymbol = contractOpt.map(DeployedContractRegistry.DeployedContractInfo::symbol).filter(s -> !s.isBlank()).orElse("TOKEN");
        int decimals = contractOpt.map(DeployedContractRegistry.DeployedContractInfo::decimals).orElse(18);

        // 1. Native ETH Delta Calculation
        BigInteger value = (valueWei != null && !valueWei.isBlank()) ? new BigInteger(valueWei) : BigInteger.ZERO;
        long gasUsed = gasEstimated != null ? gasEstimated : 21000L;
        BigInteger gasPrice = BigInteger.valueOf(1_000_000_000L); // 1 gwei on local Hardhat
        BigInteger gasCost = BigInteger.valueOf(gasUsed).multiply(gasPrice);
        BigInteger totalOutflow = value.add(gasCost);
        String nativeEthDelta = String.format("-%s ETH (Value: %s ETH + Gas Fee: %s ETH)",
                CalldataDecoder.formatEther(totalOutflow),
                CalldataDecoder.formatEther(value),
                CalldataDecoder.formatEther(gasCost));

        // 2. ERC-20 Transfer Analysis
        if ("transfer(address,uint256)".equals(decodedCall.functionSignature())) {
            String recipient = (String) decodedCall.parameters().get("recipient");
            BigInteger amount = decodedCall.primaryAmount() != null ? decodedCall.primaryAmount() : BigInteger.ZERO;
            boolean isSelfTransfer = recipient != null && from.equalsIgnoreCase(recipient);
            boolean isZeroAddress = recipient == null || "0x0000000000000000000000000000000000000000".equalsIgnoreCase(recipient);

            BigInteger preFromBalance = readTokenBalance(to, from);

            if (isSelfTransfer) {
                // Self-transfer: balance doesn't change on net, do not duplicate account in deltas
                balanceDeltas.add(new TokenBalanceDelta(
                        to, tokenSymbol, from, preFromBalance, preFromBalance,
                        BigInteger.ZERO, "0.0 " + tokenSymbol
                ));
            } else {
                BigInteger postFromBalance = preFromBalance.compareTo(amount) >= 0 ? preFromBalance.subtract(amount) : BigInteger.ZERO;
                balanceDeltas.add(new TokenBalanceDelta(
                        to, tokenSymbol, from, preFromBalance, postFromBalance,
                        amount.negate(), "-" + CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol)
                ));

                BigInteger preToBalance = isZeroAddress ? BigInteger.ZERO : readTokenBalance(to, recipient);
                BigInteger postToBalance = preToBalance.add(amount);

                balanceDeltas.add(new TokenBalanceDelta(
                        to, tokenSymbol, recipient, preToBalance, postToBalance,
                        amount, "+" + CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol)
                ));
            }

            projectedEvents.add(String.format("Transfer(from: %s, to: %s, amount: %s)",
                    from, recipient, CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol)));

            String summary = isSelfTransfer
                    ? String.format("Self-transfer: %s transferred to same account %s. Net token balance change is 0.0 %s.",
                            CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol), from, tokenSymbol)
                    : isZeroAddress
                    ? String.format("Token burn: %s will decrease by %s transferred to zero address (burned).",
                            from, CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol))
                    : String.format("Balances will update: %s will decrease by %s, and recipient %s will receive %s.",
                            from, CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol),
                            recipient, CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol));

            return new StateEffectResult(balanceDeltas, allowanceDeltas, nativeEthDelta, projectedEvents, summary);
        }

        // 2b. ERC-20 transferFrom Analysis
        if ("transferFrom(address,address,uint256)".equals(decodedCall.functionSignature())) {
            String sender = (String) decodedCall.parameters().get("from");
            String recipient = (String) decodedCall.parameters().get("to");
            BigInteger amount = decodedCall.primaryAmount() != null ? decodedCall.primaryAmount() : BigInteger.ZERO;
            boolean isSelfTransfer = recipient != null && sender != null && sender.equalsIgnoreCase(recipient);

            BigInteger preFromBalance = readTokenBalance(to, sender);
            if (isSelfTransfer) {
                balanceDeltas.add(new TokenBalanceDelta(
                        to, tokenSymbol, sender, preFromBalance, preFromBalance,
                        BigInteger.ZERO, "0.0 " + tokenSymbol
                ));
            } else {
                BigInteger postFromBalance = preFromBalance.compareTo(amount) >= 0 ? preFromBalance.subtract(amount) : BigInteger.ZERO;
                balanceDeltas.add(new TokenBalanceDelta(
                        to, tokenSymbol, sender, preFromBalance, postFromBalance,
                        amount.negate(), "-" + CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol)
                ));

                BigInteger preToBalance = readTokenBalance(to, recipient);
                BigInteger postToBalance = preToBalance.add(amount);
                balanceDeltas.add(new TokenBalanceDelta(
                        to, tokenSymbol, recipient, preToBalance, postToBalance,
                        amount, "+" + CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol)
                ));
            }

            BigInteger preAllowance = readTokenAllowance(to, sender, from);
            BigInteger postAllowance = preAllowance.compareTo(amount) >= 0 ? preAllowance.subtract(amount) : BigInteger.ZERO;
            allowanceDeltas.add(new TokenAllowanceDelta(
                    to, tokenSymbol, sender, from, preAllowance, postAllowance, false,
                    String.format("Spender allowance for %s decreases by %s.", from, CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol))
            ));

            projectedEvents.add(String.format("Transfer(from: %s, to: %s, amount: %s)",
                    sender, recipient, CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol)));

            String summary = String.format("TransferFrom: %s will transfer %s from %s to %s.",
                    from, CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol), sender, recipient);

            return new StateEffectResult(balanceDeltas, allowanceDeltas, nativeEthDelta, projectedEvents, summary);
        }

        // 3. ERC-20 Approval Analysis
        if (decodedCall.isApproval()) {
            String spender = decodedCall.spenderAddress();
            BigInteger requestedAmount = decodedCall.primaryAmount();
            BigInteger preAllowance = readTokenAllowance(to, from, spender);

            boolean isUnlimited = decodedCall.isUnlimitedApproval();
            BigInteger postAllowance = requestedAmount;

            String formattedAllowance = isUnlimited ? "UNLIMITED (MAX_UINT256)" : CalldataDecoder.formatTokenAmount(requestedAmount, decimals, tokenSymbol);

            String humanExplanation = isUnlimited
                    ? String.format("CRITICAL PERMISSION: Spender %s receives perpetual, unlimited approval to spend all %s from your account.", spender, tokenSymbol)
                    : String.format("Spender %s is granted permission to withdraw up to %s.", spender, formattedAllowance);

            allowanceDeltas.add(new TokenAllowanceDelta(
                    to, tokenSymbol, from, spender, preAllowance, postAllowance, isUnlimited, humanExplanation
            ));

            projectedEvents.add(String.format("Approval(owner: %s, spender: %s, value: %s)",
                    from, spender, formattedAllowance));

            String summary = String.format("Contract allowance will change: Spender %s will gain permission to spend %s on your behalf.",
                    spender, formattedAllowance);

            return new StateEffectResult(balanceDeltas, allowanceDeltas, nativeEthDelta, projectedEvents, summary);
        }

        // 4. SafeVault Escrow Deposit
        if ("deposit(uint256)".equals(decodedCall.functionSignature())) {
            BigInteger amount = decodedCall.primaryAmount();
            projectedEvents.add(String.format("Deposited(user: %s, amount: %s)", from, CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol)));
            String summary = String.format("Tokens (%s) will be locked into SafeVault escrow under your account.",
                    CalldataDecoder.formatTokenAmount(amount, decimals, tokenSymbol));
            return new StateEffectResult(balanceDeltas, allowanceDeltas, nativeEthDelta, projectedEvents, summary);
        }

        // 5. Native ETH Transfer
        if ("native_eth_transfer()".equals(decodedCall.functionSignature())) {
            projectedEvents.add(String.format("NativeTransfer(from: %s, to: %s, amount: %s ETH)", from, to, CalldataDecoder.formatEther(value)));
            String summary = String.format("Native balance will decrease by %s ETH for sender and increase by %s ETH for recipient.",
                    CalldataDecoder.formatEther(value), CalldataDecoder.formatEther(value));
            return new StateEffectResult(balanceDeltas, allowanceDeltas, nativeEthDelta, projectedEvents, summary);
        }

        // Fallback: explicitly marked as unsupported rather than guessed
        String summary = String.format("UNSUPPORTED OPERATION: State effects for '%s' on contract %s cannot be statically projected with certainty. Actual on-chain state changes will be determined at transaction execution.",
                decodedCall.functionSignature(), to);
        return new StateEffectResult(balanceDeltas, allowanceDeltas, nativeEthDelta, projectedEvents, summary);
    }

    /**
     * Reads real ERC-20 balance on-chain via eth_call (balanceOf(address) -> selector 0x70a08231).
     * Falls back to deterministic mock values if node is offline.
     */
    private BigInteger readTokenBalance(String tokenAddress, String account) {
        if (rpcClient.isAvailable() && account != null && account.length() == 42) {
            String calldata = "0x70a08231000000000000000000000000" + account.substring(2).toLowerCase(Locale.ROOT);
            EvmRpcClient.EthCallResult result = rpcClient.ethCall(null, tokenAddress, calldata, "0");
            if (result.success() && result.returnData() != null && !result.returnData().equals("0x")) {
                try {
                    String clean = result.returnData().startsWith("0x") ? result.returnData().substring(2) : result.returnData();
                    return new BigInteger(clean, 16);
                } catch (Exception ignored) {}
            }
        }
        // Fallback default: Test user has 50,000 tokens on local Hardhat, other accounts default to 0
        if (account != null && contractRegistry.getTestUserAddress().equalsIgnoreCase(account)) {
            return new BigInteger("50000000000000000000000"); // 50,000 tokens
        }
        return BigInteger.ZERO;
    }

    /**
     * Reads real ERC-20 allowance on-chain via eth_call (allowance(address,address) -> selector 0xdd62ed3e).
     */
    private BigInteger readTokenAllowance(String tokenAddress, String owner, String spender) {
        if (rpcClient.isAvailable() && owner != null && spender != null && owner.length() == 42 && spender.length() == 42) {
            String calldata = "0xdd62ed3e"
                    + "000000000000000000000000" + owner.substring(2).toLowerCase(Locale.ROOT)
                    + "000000000000000000000000" + spender.substring(2).toLowerCase(Locale.ROOT);
            EvmRpcClient.EthCallResult result = rpcClient.ethCall(null, tokenAddress, calldata, "0");
            if (result.success() && result.returnData() != null && !result.returnData().equals("0x")) {
                try {
                    String clean = result.returnData().startsWith("0x") ? result.returnData().substring(2) : result.returnData();
                    return new BigInteger(clean, 16);
                } catch (Exception ignored) {}
            }
        }
        return BigInteger.ZERO;
    }
}
