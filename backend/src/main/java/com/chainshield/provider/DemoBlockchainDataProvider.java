package com.chainshield.provider;

import com.chainshield.provider.model.ContractData;
import com.chainshield.provider.model.TransactionData;
import com.chainshield.provider.model.WalletData;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Component
public class DemoBlockchainDataProvider implements BlockchainDataProvider {

    public static final String DATA_SOURCE_DEMO = "LOCAL_HARDHAT_DEMO_DATASET";

    // Known Hardhat test addresses
    public static final String HONEYPOT_CONTRACT = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
    public static final String SAFE_VAULT_CONTRACT = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";
    public static final String DANGEROUS_SPENDER = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
    public static final String SIMULATED_MIXER = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";
    public static final String SIMULATED_DRAINER = "0x90f79bf6eb2c4f870365e785982e1f101e93b906";
    public static final String BENIGN_TEST_WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

    @Override
    public WalletData getWalletData(String address) {
        String normalized = address.toLowerCase(Locale.ROOT);

        if (normalized.equals(SIMULATED_MIXER)) {
            return new WalletData(address, 120, 450, 310, List.of(BENIGN_TEST_WALLET), false, DATA_SOURCE_DEMO);
        } else if (normalized.equals(SIMULATED_DRAINER)) {
            return new WalletData(address, 3, 24, 20, List.of(BENIGN_TEST_WALLET), true, DATA_SOURCE_DEMO);
        } else if (normalized.equals(BENIGN_TEST_WALLET)) {
            return new WalletData(address, 45, 12, 5, List.of(SAFE_VAULT_CONTRACT), false, DATA_SOURCE_DEMO);
        }

        // Deterministic synthetic fallback for arbitrary test addresses
        int hash = Math.abs(normalized.hashCode());
        int ageDays = (hash % 180) + 1;
        int txCount = (hash % 50);
        int counterparties = (hash % 20) + 1;

        return new WalletData(address, ageDays, txCount, counterparties, Collections.emptyList(), false, DATA_SOURCE_DEMO);
    }

    @Override
    public ContractData getContractData(String contractAddress) {
        String normalized = contractAddress.toLowerCase(Locale.ROOT);

        if (normalized.equals(HONEYPOT_CONTRACT)) {
            return new ContractData(
                    contractAddress,
                    "HoneypotToken (Hardhat Testbed)",
                    true,
                    3840,
                    false, // unverified source
                    false,
                    true,  // has blacklist
                    true,  // trading locked!
                    false,
                    false,
                    DATA_SOURCE_DEMO
            );
        } else if (normalized.equals(SAFE_VAULT_CONTRACT)) {
            return new ContractData(
                    contractAddress,
                    "SafeVault (Benign Escrow Demo)",
                    true,
                    2120,
                    true,  // verified
                    false,
                    false,
                    false,
                    false,
                    false,
                    DATA_SOURCE_DEMO
            );
        } else if (normalized.equals(DANGEROUS_SPENDER)) {
            return new ContractData(
                    contractAddress,
                    "DangerousApprovalSpender (Drainer Demo)",
                    true,
                    1890,
                    false,
                    false,
                    false,
                    false,
                    false,
                    false,
                    DATA_SOURCE_DEMO
            );
        }

        // Generic fallback for any other contract address: determine properties deterministically
        int hash = Math.abs(normalized.hashCode());
        boolean verified = (hash % 2 == 0);
        boolean ownerMint = (hash % 7 == 0);
        boolean tradingLocked = (hash % 11 == 0);

        return new ContractData(
                contractAddress,
                "Contract_" + contractAddress.substring(0, 8),
                true,
                2500 + (hash % 2000),
                verified,
                ownerMint,
                false,
                tradingLocked,
                false,
                false,
                DATA_SOURCE_DEMO
        );
    }

    @Override
    public TransactionData inspectTransaction(String from, String to, String valueWei, String calldata) {
        String cleanData = (calldata != null && calldata.startsWith("0x")) ? calldata.toLowerCase(Locale.ROOT) : "0x";
        String selector = cleanData.length() >= 10 ? cleanData.substring(0, 10) : "0x";

        String signature = "unknown()";
        boolean isApproval = false;
        String spender = null;
        boolean isUnlimited = false;

        switch (selector) {
            case "0x095ea7b3":
                signature = "approve(address,uint256)";
                isApproval = true;
                if (cleanData.length() >= 74) {
                    spender = "0x" + cleanData.substring(34, 74);
                }
                if (cleanData.length() >= 138) {
                    String amountHex = cleanData.substring(74, 138);
                    // Check if max uint or excessive allowance
                    if (amountHex.startsWith("ffffffff") || amountHex.replace("0", "").length() > 30) {
                        isUnlimited = true;
                    }
                }
                break;
            case "0xa9059cbb":
                signature = "transfer(address,uint256)";
                break;
            case "0x23b872dd":
                signature = "transferFrom(address,address,uint256)";
                break;
            case "0xd0e30db0":
                signature = "deposit()";
                break;
            case "0x2e1a7d4d":
                signature = "withdraw(uint256)";
                break;
            default:
                if (cleanData.equals("0x") || cleanData.length() < 10) {
                    signature = "native_eth_transfer()";
                }
                break;
        }

        return new TransactionData(
                from,
                to,
                valueWei != null ? valueWei : "0",
                calldata,
                selector,
                signature,
                isApproval,
                spender,
                isUnlimited,
                DATA_SOURCE_DEMO
        );
    }
}
