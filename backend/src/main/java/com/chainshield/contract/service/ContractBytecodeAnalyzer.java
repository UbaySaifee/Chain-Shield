package com.chainshield.contract.service;

import com.chainshield.blockchain.client.EvmRpcClient;
import com.chainshield.contract.model.ProxyInfoDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Service performing practical bytecode-level heuristic analysis and ERC-1967 proxy storage slot inspection.
 */
@Service
public class ContractBytecodeAnalyzer {

    private static final Logger log = LoggerFactory.getLogger(ContractBytecodeAnalyzer.class);

    // EIP-1967 Implementation Slot: bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
    private static final String EIP1967_IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

    // EIP-1967 Admin Slot: bytes32(uint256(keccak256('eip1967.proxy.admin')) - 1)
    private static final String EIP1967_ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";

    private final EvmRpcClient rpcClient;

    public ContractBytecodeAnalyzer(EvmRpcClient rpcClient) {
        this.rpcClient = rpcClient;
    }

    public BytecodeAnalysisResult analyzeBytecode(String address, String bytecodeHex) {
        if (bytecodeHex == null || bytecodeHex.equals("0x") || bytecodeHex.length() <= 2) {
            return new BytecodeAnalysisResult(
                    false,
                    false,
                    new ProxyInfoDto("NO", "None / Unknown", "None / Unknown", "Not detected", "None", false),
                    false
            );
        }

        // Opcode 0xF4 = DELEGATECALL (scanned outside PUSH data)
        boolean hasDelegateCallOpcode = containsOpcode(bytecodeHex, 0xF4);

        // Opcode 0xFF = SELFDESTRUCT (scanned outside PUSH data)
        boolean hasSelfDestructOpcode = containsOpcode(bytecodeHex, 0xFF);

        // Inspect EIP-1967 storage slots via read-only RPC
        String implSlotValue = rpcClient.getStorageAt(address, EIP1967_IMPL_SLOT);
        String adminSlotValue = rpcClient.getStorageAt(address, EIP1967_ADMIN_SLOT);

        String implAddress = extractAddressFromSlot(implSlotValue);
        String adminAddress = extractAddressFromSlot(adminSlotValue);

        boolean isEip1967Proxy = implAddress != null;
        boolean proxyDetected = isEip1967Proxy || hasDelegateCallOpcode;

        String proxyType = "None";
        String upgradeability = "Not detected";

        if (isEip1967Proxy) {
            proxyType = "EIP-1967 Transparent Upgradeable Proxy";
            upgradeability = "Detected";
        } else if (hasDelegateCallOpcode) {
            proxyType = "Heuristic Delegatecall Forwarder";
            upgradeability = "Possible (Heuristic)";
        }

        ProxyInfoDto proxyInfo = new ProxyInfoDto(
                proxyDetected ? "YES" : "NO",
                implAddress != null ? implAddress : "None / Unknown",
                adminAddress != null ? adminAddress : "None / Unknown",
                upgradeability,
                proxyType,
                !isEip1967Proxy && hasDelegateCallOpcode // true if heuristic
        );

        return new BytecodeAnalysisResult(
                hasDelegateCallOpcode,
                hasSelfDestructOpcode,
                proxyInfo,
                proxyDetected
        );
    }

    private static boolean containsOpcode(String bytecodeHex, int targetOpcode) {
        if (bytecodeHex == null || bytecodeHex.length() <= 2) return false;
        String clean = bytecodeHex.startsWith("0x") || bytecodeHex.startsWith("0X")
                ? bytecodeHex.substring(2)
                : bytecodeHex;

        int len = clean.length() / 2;
        if (len < 1) return false;

        byte[] bytes = new byte[len];
        for (int i = 0; i < len; i++) {
            int high = Character.digit(clean.charAt(i * 2), 16);
            int low = Character.digit(clean.charAt(i * 2 + 1), 16);
            if (high == -1 || low == -1) return false;
            bytes[i] = (byte) ((high << 4) | low);
        }

        // Standard Solidity metadata check: last 2 bytes indicate metadata length
        int codeEnd = len;
        if (len > 2) {
            int metaLen = ((bytes[len - 2] & 0xFF) << 8) | (bytes[len - 1] & 0xFF);
            if (metaLen > 0 && metaLen < len - 2) {
                codeEnd = len - 2 - metaLen;
            }
        }

        int pc = 0;
        while (pc < codeEnd) {
            int op = bytes[pc] & 0xFF;
            if (op == targetOpcode) {
                return true;
            }
            // PUSH1 (0x60) to PUSH32 (0x7F)
            if (op >= 0x60 && op <= 0x7F) {
                int pushBytes = op - 0x60 + 1;
                pc += 1 + pushBytes;
            } else {
                pc++;
            }
        }
        return false;
    }

    private String extractAddressFromSlot(String slotHex) {
        if (slotHex == null) return null;
        String clean = slotHex.startsWith("0x") ? slotHex.substring(2) : slotHex;
        if (clean.length() < 64) return null;
        String addrPart = "0x" + clean.substring(24, 64);
        if (addrPart.equalsIgnoreCase("0x0000000000000000000000000000000000000000")) {
            return null;
        }
        return addrPart.toLowerCase();
    }

    public record BytecodeAnalysisResult(
            boolean hasDelegateCall,
            boolean hasSelfDestruct,
            ProxyInfoDto proxyInfo,
            boolean isProxyOrForwarder
    ) {}
}
