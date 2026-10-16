package com.chainshield.provider;

import com.chainshield.blockchain.client.EvmRpcClient;
import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.chainshield.provider.model.ContractData;
import com.chainshield.provider.model.TransactionData;
import com.chainshield.provider.model.WalletData;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Locale;
import java.util.Optional;

/**
 * Primary blockchain provider querying the local Hardhat EVM node.
 * Seamlessly falls back to DemoBlockchainDataProvider if the RPC node is offline.
 */
@Component
@Primary
public class HardhatBlockchainProvider implements BlockchainDataProvider {

    private final EvmRpcClient rpcClient;
    private final DeployedContractRegistry contractRegistry;
    private final DemoBlockchainDataProvider fallbackDemoProvider;

    public static final String DATA_SOURCE_HARDHAT_LIVE = "LOCAL_HARDHAT_EVM_LIVE";

    public HardhatBlockchainProvider(
            EvmRpcClient rpcClient,
            DeployedContractRegistry contractRegistry,
            DemoBlockchainDataProvider fallbackDemoProvider
    ) {
        this.rpcClient = rpcClient;
        this.contractRegistry = contractRegistry;
        this.fallbackDemoProvider = fallbackDemoProvider;
    }

    @Override
    public WalletData getWalletData(String address) {
        if (!rpcClient.isAvailable()) {
            return fallbackDemoProvider.getWalletData(address);
        }

        String normalized = address.toLowerCase(Locale.ROOT);
        String code = rpcClient.getCode(normalized);
        boolean isContract = code != null && code.length() > 2;

        return new WalletData(
                address,
                30,
                isContract ? 50 : 15,
                10,
                Collections.emptyList(),
                isContract,
                DATA_SOURCE_HARDHAT_LIVE
        );
    }

    @Override
    public ContractData getContractData(String contractAddress) {
        if (!rpcClient.isAvailable()) {
            return fallbackDemoProvider.getContractData(contractAddress);
        }

        String normalized = contractAddress.toLowerCase(Locale.ROOT);
        String code = rpcClient.getCode(normalized);
        boolean bytecodePresent = code != null && code.length() > 2;
        int bytecodeSize = bytecodePresent ? (code.length() - 2) / 2 : 0;

        Optional<DeployedContractRegistry.DeployedContractInfo> known = contractRegistry.findByAddress(normalized);
        if (known.isPresent()) {
            DeployedContractRegistry.DeployedContractInfo info = known.get();
            boolean isHoneypot = "MALICIOUS_HONEYPOT".equals(info.type());
            boolean isSafe = "BENIGN_VAULT".equals(info.type()) || "BENIGN_ERC20".equals(info.type());

            return new ContractData(
                    contractAddress,
                    info.name(),
                    bytecodePresent,
                    bytecodeSize,
                    isSafe, // verified source for safe contracts
                    false,
                    isHoneypot,
                    isHoneypot,
                    false,
                    false,
                    DATA_SOURCE_HARDHAT_LIVE
            );
        }

        return fallbackDemoProvider.getContractData(contractAddress);
    }

    @Override
    public TransactionData inspectTransaction(String from, String to, String valueWei, String calldata) {
        // Calldata inspection is deterministic
        return fallbackDemoProvider.inspectTransaction(from, to, valueWei, calldata);
    }
}
