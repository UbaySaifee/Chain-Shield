package com.chainshield.blockchain.decoder;

import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;

import static org.junit.jupiter.api.Assertions.*;

class CalldataDecoderTest {

    private CalldataDecoder decoder;
    private DeployedContractRegistry registry;

    @BeforeEach
    void setUp() {
        registry = new DeployedContractRegistry(new ObjectMapper());
        registry.init();
        decoder = new CalldataDecoder(registry);
    }

    @Test
    @DisplayName("Should decode ERC-20 transfer calldata")
    void testDecodeErc20Transfer() {
        // transfer(0x70997970c51812dc3a010c7d01b50e0d17dc79c8, 50 * 10^18)
        String recipient = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
        String calldata = "0xa9059cbb"
                + "00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8"
                + "000000000000000000000000000000000000000000000002b5e3af16b1880000"; // 50 ETH/tokens

        CalldataDecoder.DecodedCall call = decoder.decode(
                "0x5fbdb2315678afecb367f032d93f642f64180aa3",
                calldata,
                "0"
        );

        assertNotNull(call);
        assertEquals("0xa9059cbb", call.methodSelector());
        assertEquals("transfer(address,uint256)", call.functionSignature());
        assertEquals("ERC-20 Token Transfer", call.actionType());
        assertFalse(call.isApproval());
        assertEquals(recipient, call.parameters().get("recipient"));
        assertEquals(new BigInteger("50000000000000000000"), call.primaryAmount());
        assertTrue(call.humanInterpretation().contains("50"));
    }

    @Test
    @DisplayName("Should decode ERC-20 unlimited approve calldata")
    void testDecodeErc20UnlimitedApprove() {
        // approve(0xe7f1725e7734ce288f8367e1bb143e90bb3f0512, uint256 max)
        String spender = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
        String calldata = "0x095ea7b3"
                + "000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512"
                + "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

        CalldataDecoder.DecodedCall call = decoder.decode(
                "0x5fbdb2315678afecb367f032d93f642f64180aa3",
                calldata,
                "0"
        );

        assertNotNull(call);
        assertEquals("0x095ea7b3", call.methodSelector());
        assertEquals("approve(address,uint256)", call.functionSignature());
        assertTrue(call.isApproval());
        assertTrue(call.isUnlimitedApproval(), "Should flag MAX_UINT256 as unlimited");
        assertEquals(spender, call.spenderAddress());
        assertTrue(call.humanInterpretation().contains("UNLIMITED"));
    }

    @Test
    @DisplayName("Should decode SafeVault deposit calldata")
    void testDecodeSafeVaultDeposit() {
        // deposit(25 * 10^18)
        String calldata = "0xb6b55f25"
                + "0000000000000000000000000000000000000000000000015af1d78b58c40000";

        CalldataDecoder.DecodedCall call = decoder.decode(
                "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0",
                calldata,
                "0"
        );

        assertNotNull(call);
        assertEquals("0xb6b55f25", call.methodSelector());
        assertEquals("deposit(uint256)", call.functionSignature());
        assertTrue(call.humanInterpretation().contains("SafeVault"));
    }

    @Test
    @DisplayName("Should decode Native ETH transfer")
    void testDecodeNativeEthTransfer() {
        CalldataDecoder.DecodedCall call = decoder.decode(
                "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
                "0x",
                "1500000000000000000" // 1.5 ETH
        );

        assertNotNull(call);
        assertEquals("0x", call.methodSelector());
        assertEquals("native_eth_transfer()", call.functionSignature());
        assertEquals("1.5", call.parameters().get("valueEth"));
        assertTrue(call.humanInterpretation().contains("1.5 ETH"));
    }
}
