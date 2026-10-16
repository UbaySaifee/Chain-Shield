package com.chainshield.contract.service;

import com.chainshield.blockchain.client.EvmRpcClient;
import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.chainshield.contract.model.AbiInfoDto;
import com.chainshield.contract.model.ContractMetadataDto;
import com.chainshield.contract.model.EventDefinitionDto;
import com.chainshield.contract.model.FunctionDefinitionDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Service managing ABI inspection, interface identification, and metadata extraction for smart contracts.
 */
@Service
public class ContractAbiMetadataService {

    private static final Logger log = LoggerFactory.getLogger(ContractAbiMetadataService.class);

    private final DeployedContractRegistry contractRegistry;
    private final EvmRpcClient rpcClient;

    public ContractAbiMetadataService(DeployedContractRegistry contractRegistry, EvmRpcClient rpcClient) {
        this.contractRegistry = contractRegistry;
        this.rpcClient = rpcClient;
    }

    public ContractMetadataResult getMetadata(String address, int bytecodeSizeBytes, String bytecodeHex) {
        String normalized = address.toLowerCase(Locale.ROOT);
        Optional<DeployedContractRegistry.DeployedContractInfo> known = contractRegistry.findByAddress(normalized);

        // Also check default demo provider addresses if registry has different address mapping
        String matchedType = null;
        if (known.isPresent()) {
            matchedType = known.get().type();
        } else if ("0x5fbdb2315678afecb367f032d93f642f64180aa3".equals(normalized)) {
            matchedType = "MALICIOUS_HONEYPOT"; // Demo fallback fixture
        } else if ("0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0".equals(normalized)) {
            matchedType = "BENIGN_VAULT";
        } else if ("0xe7f1725e7734ce288f8367e1bb143e90bb3f0512".equals(normalized)) {
            matchedType = "MALICIOUS_APPROVAL_SPENDER";
        }

        if (matchedType != null) {
            return buildKnownContractMetadata(address, matchedType, bytecodeSizeBytes, bytecodeHex);
        }

        // Unknown contract: Attempt dynamic ERC-20 query via read-only eth_call
        return buildDynamicContractMetadata(address, bytecodeSizeBytes, bytecodeHex);
    }

    private ContractMetadataResult buildKnownContractMetadata(
            String address,
            String contractType,
            int bytecodeSizeBytes,
            String bytecodeHex
    ) {
        switch (contractType) {
            case "BENIGN_ERC20":
                return buildMockErc20Metadata(address, bytecodeSizeBytes, bytecodeHex);
            case "BENIGN_VAULT":
                return buildSafeVaultMetadata(address, bytecodeSizeBytes, bytecodeHex);
            case "MALICIOUS_APPROVAL_SPENDER":
                return buildDangerousSpenderMetadata(address, bytecodeSizeBytes, bytecodeHex);
            case "MALICIOUS_HONEYPOT":
                return buildHoneypotMetadata(address, bytecodeSizeBytes, bytecodeHex);
            default:
                return buildDynamicContractMetadata(address, bytecodeSizeBytes, bytecodeHex);
        }
    }

    private ContractMetadataResult buildMockErc20Metadata(String address, int bytecodeSizeBytes, String bytecodeHex) {
        List<FunctionDefinitionDto> functions = List.of(
                new FunctionDefinitionDto("name", "name()", "0x06fdde03", "view", List.of(), false),
                new FunctionDefinitionDto("symbol", "symbol()", "0x95d89b41", "view", List.of(), false),
                new FunctionDefinitionDto("decimals", "decimals()", "0x313ce567", "view", List.of(), false),
                new FunctionDefinitionDto("totalSupply", "totalSupply()", "0x18160ddd", "view", List.of(), false),
                new FunctionDefinitionDto("balanceOf", "balanceOf(address)", "0x70a08231", "view", List.of("address account"), false),
                new FunctionDefinitionDto("allowance", "allowance(address,address)", "0xdd62ed3e", "view", List.of("address owner", "address spender"), false),
                new FunctionDefinitionDto("transfer", "transfer(address,uint256)", "0xa9059cbb", "nonpayable", List.of("address to", "uint256 value"), false),
                new FunctionDefinitionDto("approve", "approve(address,uint256)", "0x095ea7b3", "nonpayable", List.of("address spender", "uint256 value"), false),
                new FunctionDefinitionDto("transferFrom", "transferFrom(address,address,uint256)", "0x23b872dd", "nonpayable", List.of("address from", "address to", "uint256 value"), false),
                new FunctionDefinitionDto("mint", "mint(address,uint256)", "0x40c10f19", "nonpayable", List.of("address to", "uint256 amount"), true),
                new FunctionDefinitionDto("burn", "burn(uint256)", "0x42966c68", "nonpayable", List.of("uint256 amount"), false),
                new FunctionDefinitionDto("owner", "owner()", "0x8da5cb5b", "view", List.of(), false),
                new FunctionDefinitionDto("transferOwnership", "transferOwnership(address)", "0xf2fde38b", "nonpayable", List.of("address newOwner"), true),
                new FunctionDefinitionDto("renounceOwnership", "renounceOwnership()", "0x715018a6", "nonpayable", List.of(), true)
        );

        List<EventDefinitionDto> events = List.of(
                new EventDefinitionDto("Transfer", "Transfer(address indexed from, address indexed to, uint256 value)", List.of("address from", "address to", "uint256 value")),
                new EventDefinitionDto("Approval", "Approval(address indexed owner, address indexed spender, uint256 value)", List.of("address owner", "address spender", "uint256 value")),
                new EventDefinitionDto("TokensMinted", "TokensMinted(address indexed to, uint256 amount)", List.of("address to", "uint256 amount")),
                new EventDefinitionDto("OwnershipTransferred", "OwnershipTransferred(address indexed previousOwner, address indexed newOwner)", List.of("address previousOwner", "address newOwner"))
        );

        AbiInfoDto abiInfo = new AbiInfoDto(
                true,
                "MockERC20 (ShieldToken)",
                functions.size(),
                events.size(),
                functions,
                events,
                List.of("ERC-20", "Ownable", "Mintable", "Burnable")
        );

        ContractMetadataDto metadata = new ContractMetadataDto(
                "ShieldToken",
                "SHLD",
                18,
                "1,000,000.0 SHLD",
                true,
                bytecodeSizeBytes,
                "LOCAL_VERIFIED",
                true,
                bytecodeHex != null && bytecodeHex.length() > 66 ? bytecodeHex.substring(0, 66) + "..." : bytecodeHex,
                "Solidity 0.8.24 (OpenZeppelin 5.x)",
                "MIT"
        );

        return new ContractMetadataResult(metadata, abiInfo, true, false, false, false, true, false);
    }

    private ContractMetadataResult buildSafeVaultMetadata(String address, int bytecodeSizeBytes, String bytecodeHex) {
        List<FunctionDefinitionDto> functions = List.of(
                new FunctionDefinitionDto("deposit", "deposit(uint256)", "0xb6b55f25", "nonpayable", List.of("uint256 amount"), false),
                new FunctionDefinitionDto("withdraw", "withdraw(uint256)", "0x2e1a7d4d", "nonpayable", List.of("uint256 amount"), false),
                new FunctionDefinitionDto("balanceOf", "balanceOf(address)", "0x70a08231", "view", List.of("address user"), false),
                new FunctionDefinitionDto("token", "token()", "0xfc0c546a", "view", List.of(), false),
                new FunctionDefinitionDto("owner", "owner()", "0x8da5cb5b", "view", List.of(), false),
                new FunctionDefinitionDto("transferOwnership", "transferOwnership(address)", "0xf2fde38b", "nonpayable", List.of("address newOwner"), true),
                new FunctionDefinitionDto("renounceOwnership", "renounceOwnership()", "0x715018a6", "nonpayable", List.of(), true)
        );

        List<EventDefinitionDto> events = List.of(
                new EventDefinitionDto("Deposited", "Deposited(address indexed user, uint256 amount)", List.of("address user", "uint256 amount")),
                new EventDefinitionDto("Withdrawn", "Withdrawn(address indexed user, uint256 amount)", List.of("address user", "uint256 amount")),
                new EventDefinitionDto("OwnershipTransferred", "OwnershipTransferred(address indexed previousOwner, address indexed newOwner)", List.of("address previousOwner", "address newOwner"))
        );

        AbiInfoDto abiInfo = new AbiInfoDto(
                true,
                "SafeVault (Escrow Vault)",
                functions.size(),
                events.size(),
                functions,
                events,
                List.of("ReentrancyGuard", "Ownable", "EscrowVault")
        );

        ContractMetadataDto metadata = new ContractMetadataDto(
                "SafeVault",
                "VAULT",
                null,
                null,
                false,
                bytecodeSizeBytes,
                "LOCAL_VERIFIED",
                true,
                bytecodeHex != null && bytecodeHex.length() > 66 ? bytecodeHex.substring(0, 66) + "..." : bytecodeHex,
                "Solidity 0.8.24 (OpenZeppelin 5.x)",
                "MIT"
        );

        return new ContractMetadataResult(metadata, abiInfo, false, false, false, false, false, false);
    }

    private ContractMetadataResult buildDangerousSpenderMetadata(String address, int bytecodeSizeBytes, String bytecodeHex) {
        List<FunctionDefinitionDto> functions = List.of(
                new FunctionDefinitionDto("setTreasury", "setTreasury(address)", "0xf0f44260", "nonpayable", List.of("address newTreasury"), true),
                new FunctionDefinitionDto("drainVictim", "drainVictim(address,address)", "0x12c40c88", "nonpayable", List.of("address tokenAddress", "address victim"), false),
                new FunctionDefinitionDto("treasury", "treasury()", "0x61d027b3", "view", List.of(), false),
                new FunctionDefinitionDto("owner", "owner()", "0x8da5cb5b", "view", List.of(), false),
                new FunctionDefinitionDto("transferOwnership", "transferOwnership(address)", "0xf2fde38b", "nonpayable", List.of("address newOwner"), true),
                new FunctionDefinitionDto("renounceOwnership", "renounceOwnership()", "0x715018a6", "nonpayable", List.of(), true)
        );

        List<EventDefinitionDto> events = List.of(
                new EventDefinitionDto("ApprovalExploited", "ApprovalExploited(address indexed token, address indexed victim, address indexed receiver, uint256 amount)", List.of("address token", "address victim", "address receiver", "uint256 amount")),
                new EventDefinitionDto("TreasuryUpdated", "TreasuryUpdated(address newTreasury)", List.of("address newTreasury")),
                new EventDefinitionDto("OwnershipTransferred", "OwnershipTransferred(address indexed previousOwner, address indexed newOwner)", List.of("address previousOwner", "address newOwner"))
        );

        AbiInfoDto abiInfo = new AbiInfoDto(
                true,
                "DangerousApprovalSpender",
                functions.size(),
                events.size(),
                functions,
                events,
                List.of("Ownable", "DangerousSpender", "ApprovalExploit")
        );

        ContractMetadataDto metadata = new ContractMetadataDto(
                "DangerousApprovalSpender",
                "DRAIN",
                null,
                null,
                false,
                bytecodeSizeBytes,
                "LOCAL_VERIFIED",
                true,
                bytecodeHex != null && bytecodeHex.length() > 66 ? bytecodeHex.substring(0, 66) + "..." : bytecodeHex,
                "Solidity 0.8.24",
                "MIT"
        );

        return new ContractMetadataResult(metadata, abiInfo, false, false, false, false, false, true);
    }

    private ContractMetadataResult buildHoneypotMetadata(String address, int bytecodeSizeBytes, String bytecodeHex) {
        List<FunctionDefinitionDto> functions = List.of(
                new FunctionDefinitionDto("name", "name()", "0x06fdde03", "view", List.of(), false),
                new FunctionDefinitionDto("symbol", "symbol()", "0x95d89b41", "view", List.of(), false),
                new FunctionDefinitionDto("decimals", "decimals()", "0x313ce567", "view", List.of(), false),
                new FunctionDefinitionDto("totalSupply", "totalSupply()", "0x18160ddd", "view", List.of(), false),
                new FunctionDefinitionDto("balanceOf", "balanceOf(address)", "0x70a08231", "view", List.of("address account"), false),
                new FunctionDefinitionDto("allowance", "allowance(address,address)", "0xdd62ed3e", "view", List.of("address owner", "address spender"), false),
                new FunctionDefinitionDto("transfer", "transfer(address,uint256)", "0xa9059cbb", "nonpayable", List.of("address to", "uint256 value"), false),
                new FunctionDefinitionDto("approve", "approve(address,uint256)", "0x095ea7b3", "nonpayable", List.of("address spender", "uint256 value"), false),
                new FunctionDefinitionDto("transferFrom", "transferFrom(address,address,uint256)", "0x23b872dd", "nonpayable", List.of("address from", "address to", "uint256 value"), false),
                new FunctionDefinitionDto("tradingLocked", "tradingLocked()", "0xceb4f4c2", "view", List.of(), false),
                new FunctionDefinitionDto("blacklisted", "blacklisted(address)", "0xfe575a0f", "view", List.of("address account"), false),
                new FunctionDefinitionDto("setTradingLocked", "setTradingLocked(bool)", "0xc07c9927", "nonpayable", List.of("bool locked"), true),
                new FunctionDefinitionDto("setBlacklist", "setBlacklist(address,bool)", "0xa1a9f071", "nonpayable", List.of("address target", "bool status"), true),
                new FunctionDefinitionDto("emergencyDrain", "emergencyDrain(address)", "0x40fd4b98", "nonpayable", List.of("address tokenAddress"), true),
                new FunctionDefinitionDto("owner", "owner()", "0x8da5cb5b", "view", List.of(), false),
                new FunctionDefinitionDto("transferOwnership", "transferOwnership(address)", "0xf2fde38b", "nonpayable", List.of("address newOwner"), true),
                new FunctionDefinitionDto("renounceOwnership", "renounceOwnership()", "0x715018a6", "nonpayable", List.of(), true)
        );

        List<EventDefinitionDto> events = List.of(
                new EventDefinitionDto("Transfer", "Transfer(address indexed from, address indexed to, uint256 value)", List.of("address from", "address to", "uint256 value")),
                new EventDefinitionDto("Approval", "Approval(address indexed owner, address indexed spender, uint256 value)", List.of("address owner", "address spender", "uint256 value")),
                new EventDefinitionDto("HoneypotTriggered", "HoneypotTriggered(address indexed attemptedSender, address indexed attemptedRecipient, uint256 amount)", List.of("address sender", "address recipient", "uint256 amount")),
                new EventDefinitionDto("BlacklistUpdated", "BlacklistUpdated(address indexed target, bool status)", List.of("address target", "bool status")),
                new EventDefinitionDto("TradingLockUpdated", "TradingLockUpdated(bool locked)", List.of("bool locked")),
                new EventDefinitionDto("OwnershipTransferred", "OwnershipTransferred(address indexed previousOwner, address indexed newOwner)", List.of("address previousOwner", "address newOwner"))
        );

        AbiInfoDto abiInfo = new AbiInfoDto(
                true,
                "HoneypotToken (TrapToken)",
                functions.size(),
                events.size(),
                functions,
                events,
                List.of("ERC-20", "Ownable", "HoneypotTrap", "Blacklistable")
        );

        ContractMetadataDto metadata = new ContractMetadataDto(
                "TrapToken",
                "TRAP",
                18,
                "100,000.0 TRAP",
                true,
                bytecodeSizeBytes,
                "LOCAL_VERIFIED",
                true,
                bytecodeHex != null && bytecodeHex.length() > 66 ? bytecodeHex.substring(0, 66) + "..." : bytecodeHex,
                "Solidity 0.8.24",
                "MIT"
        );

        return new ContractMetadataResult(metadata, abiInfo, true, true, true, true, false, false);
    }

    private ContractMetadataResult buildDynamicContractMetadata(String address, int bytecodeSizeBytes, String bytecodeHex) {
        // Query ERC-20 standard functions via read-only eth_call
        String name = queryErc20String(address, "0x06fdde03");
        String symbol = queryErc20String(address, "0x95d89b41");
        Integer decimals = queryErc20Decimals(address);
        boolean isErc20 = name != null || symbol != null || decimals != null;

        AbiInfoDto abiInfo = new AbiInfoDto(
                false,
                isErc20 ? (name != null ? name : "Unregistered ERC-20 Token") : "Unknown Contract",
                0,
                0,
                List.of(),
                List.of(),
                isErc20 ? List.of("ERC-20 (Heuristic Detection)") : List.of()
        );

        ContractMetadataDto metadata = new ContractMetadataDto(
                name != null ? name : (isErc20 ? "Detected ERC-20" : "Unverified Contract"),
                symbol != null ? symbol : "",
                decimals,
                null,
                isErc20,
                bytecodeSizeBytes,
                "SOURCE_UNAVAILABLE",
                bytecodeSizeBytes > 0,
                bytecodeHex != null && bytecodeHex.length() > 66 ? bytecodeHex.substring(0, 66) + "..." : bytecodeHex,
                "Unknown / Unverified",
                "Unknown"
        );

        return new ContractMetadataResult(metadata, abiInfo, isErc20, false, false, false, false, false);
    }

    private String queryErc20String(String address, String selector) {
        try {
            var callResult = rpcClient.ethCall(null, address, selector, "0");
            if (callResult.success() && callResult.returnData() != null && callResult.returnData().length() > 66) {
                return decodeAbiString(callResult.returnData());
            }
        } catch (Exception e) {
            log.debug("ERC20 string query {} failed on {}: {}", selector, address, e.getMessage());
        }
        return null;
    }

    private Integer queryErc20Decimals(String address) {
        try {
            var callResult = rpcClient.ethCall(null, address, "0x313ce567", "0");
            if (callResult.success() && callResult.returnData() != null && !callResult.returnData().equals("0x")) {
                String hex = callResult.returnData().replace("0x", "");
                if (!hex.isEmpty()) {
                    return new BigInteger(hex, 16).intValue();
                }
            }
        } catch (Exception e) {
            log.debug("ERC20 decimals query failed on {}: {}", address, e.getMessage());
        }
        return null;
    }

    private String decodeAbiString(String returnDataHex) {
        try {
            String hex = returnDataHex.startsWith("0x") ? returnDataHex.substring(2) : returnDataHex;
            if (hex.length() < 128) return null;
            // Standard ABI dynamic string: offset at word 0, length at word 1, string data at word 2
            int offset = new BigInteger(hex.substring(0, 64), 16).intValue() * 2;
            if (offset + 64 > hex.length()) return null;
            int length = new BigInteger(hex.substring(offset, offset + 64), 16).intValue();
            int dataStart = offset + 64;
            int dataEnd = Math.min(hex.length(), dataStart + (length * 2));
            byte[] bytes = hexStringToByteArray(hex.substring(dataStart, dataEnd));
            return new String(bytes, StandardCharsets.UTF_8).trim();
        } catch (Exception e) {
            return null;
        }
    }

    private byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                    + Character.digit(s.charAt(i + 1), 16));
        }
        return data;
    }

    public record ContractMetadataResult(
            ContractMetadataDto metadata,
            AbiInfoDto abiInfo,
            boolean isErc20,
            boolean isTradingLocked,
            boolean hasBlacklist,
            boolean hasOwnerOnlyDrain,
            boolean hasOwnerOnlyMint,
            boolean hasDangerousSpenderPattern
    ) {}
}
