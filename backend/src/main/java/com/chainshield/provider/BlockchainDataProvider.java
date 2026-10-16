package com.chainshield.provider;

import com.chainshield.provider.model.ContractData;
import com.chainshield.provider.model.TransactionData;
import com.chainshield.provider.model.WalletData;

public interface BlockchainDataProvider {
    WalletData getWalletData(String address);
    ContractData getContractData(String contractAddress);
    TransactionData inspectTransaction(String from, String to, String valueWei, String calldata);
}
