package com.chainshield.provider;

import com.chainshield.provider.model.ContractData;
import com.chainshield.provider.model.TransactionData;
import com.chainshield.provider.model.WalletData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DemoBlockchainDataProviderTest {

    private DemoBlockchainDataProvider provider;

    @BeforeEach
    void setUp() {
        provider = new DemoBlockchainDataProvider();
    }

    @Test
    @DisplayName("Should retrieve simulated threat profile for known mixer address")
    void testGetKnownMixerWallet() {
        WalletData data = provider.getWalletData(DemoBlockchainDataProvider.SIMULATED_MIXER);
        assertNotNull(data);
        assertEquals(DemoBlockchainDataProvider.SIMULATED_MIXER, data.address());
        assertEquals(120, data.accountAgeDays());
        assertEquals(450, data.transactionCount());
        assertFalse(data.isContract());
        assertEquals(DemoBlockchainDataProvider.DATA_SOURCE_DEMO, data.dataSource());
    }

    @Test
    @DisplayName("Should flag known drainer wallet as simulated contract/drainer profile")
    void testGetKnownDrainerWallet() {
        WalletData data = provider.getWalletData(DemoBlockchainDataProvider.SIMULATED_DRAINER);
        assertNotNull(data);
        assertTrue(data.isContract());
        assertEquals(3, data.accountAgeDays());
    }

    @Test
    @DisplayName("Should retrieve known Honeypot testbed contract flags")
    void testGetHoneypotContract() {
        ContractData data = provider.getContractData(DemoBlockchainDataProvider.HONEYPOT_CONTRACT);
        assertNotNull(data);
        assertFalse(data.isVerified(), "Honeypot contract should not be marked verified");
        assertTrue(data.hasBlacklist(), "Honeypot contract has blacklist functions");
        assertTrue(data.isTradingLocked(), "Honeypot contract has trading disabled");
        assertTrue(data.isBytecodePresent());
    }

    @Test
    @DisplayName("Should retrieve SafeVault as verified benign contract")
    void testGetSafeVaultContract() {
        ContractData data = provider.getContractData(DemoBlockchainDataProvider.SAFE_VAULT_CONTRACT);
        assertNotNull(data);
        assertTrue(data.isVerified());
        assertFalse(data.hasBlacklist());
        assertFalse(data.isTradingLocked());
    }

    @Test
    @DisplayName("Should decode ERC-20 unlimited approval calldata")
    void testDecodeUnlimitedApproval() {
        // approve(0xe7f1725e7734ce288f8367e1bb143e90bb3f0512, uint256 max)
        String spender = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
        String calldata = "0x095ea7b3"
                + "000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512"
                + "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

        TransactionData tx = provider.inspectTransaction(
                "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
                "0x5fbdb2315678afecb367f032d93f642f64180aa3",
                "0",
                calldata
        );

        assertNotNull(tx);
        assertTrue(tx.isApproval(), "Transaction should be recognized as token approval");
        assertTrue(tx.isUnlimitedApproval(), "Transaction should be recognized as unlimited approval");
        assertEquals("0x095ea7b3", tx.methodSelector());
        assertEquals("approve(address,uint256)", tx.methodSignature());
        assertEquals(spender.toLowerCase(), tx.spenderAddress().toLowerCase());
    }

    @Test
    @DisplayName("Should recognize native ETH transfer without contract calldata")
    void testDecodeNativeEthTransfer() {
        TransactionData tx = provider.inspectTransaction(
                "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
                "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
                "1000000000000000000",
                "0x"
        );

        assertNotNull(tx);
        assertFalse(tx.isApproval());
        assertFalse(tx.isUnlimitedApproval());
        assertEquals("native_eth_transfer()", tx.methodSignature());
    }
}
