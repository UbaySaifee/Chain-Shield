package com.chainshield.contract.service;

import com.chainshield.blockchain.client.EvmRpcClient;
import com.chainshield.contract.model.AdminInfoDto;
import com.chainshield.contract.model.FunctionDefinitionDto;
import com.chainshield.contract.model.OwnershipInfoDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service analyzing ownership and administrative permissions on smart contracts.
 * Performs safe, read-only calls to determine active owners and privileged administrative capabilities.
 */
@Service
public class ContractPermissionAnalyzer {

    private static final Logger log = LoggerFactory.getLogger(ContractPermissionAnalyzer.class);

    private final EvmRpcClient rpcClient;

    public ContractPermissionAnalyzer(EvmRpcClient rpcClient) {
        this.rpcClient = rpcClient;
    }

    public PermissionAnalysisResult analyze(String address, List<FunctionDefinitionDto> functions) {
        String ownerAddress = queryOwner(address);
        String adminAddress = queryAdmin(address);

        List<String> privilegedFunctions = functions.stream()
                .filter(FunctionDefinitionDto::isPrivileged)
                .map(FunctionDefinitionDto::name)
                .collect(Collectors.toList());

        boolean hasOwner = ownerAddress != null || !privilegedFunctions.isEmpty();
        boolean hasAdmin = adminAddress != null;

        String privilegeType = "None Detected";
        if (hasOwner && hasAdmin) {
            privilegeType = "Dual Owner & Proxy Admin";
        } else if (hasOwner) {
            privilegeType = "Single-Key Administrative Owner (OpenZeppelin Ownable)";
        } else if (hasAdmin) {
            privilegeType = "Proxy Admin Controlled";
        }

        String whyItMatters;
        if (hasOwner) {
            whyItMatters = "The contract owner holds unilateral authority over administrative functions " +
                    (privilegedFunctions.isEmpty() ? "" : "(" + String.join(", ", privilegedFunctions) + ")") +
                    ". If the owner key is compromised, contract parameters or asset flows can be altered.";
        } else {
            whyItMatters = "No centralized owner address was detected. The contract may be autonomous, immutable, or governed by decentralized mechanisms.";
        }

        OwnershipInfoDto ownershipInfo = new OwnershipInfoDto(
                hasOwner,
                ownerAddress != null ? ownerAddress : (hasOwner ? "Configured in bytecode" : "None / Renounced"),
                privilegeType,
                privilegedFunctions,
                whyItMatters
        );

        AdminInfoDto adminInfo = new AdminInfoDto(
                hasAdmin,
                adminAddress != null ? adminAddress : "None Detected",
                hasAdmin,
                hasAdmin ? List.of("PROXY_ADMIN") : List.of(),
                hasAdmin ? "Contract administrative authority is managed by a distinct admin address." : "Standard non-proxy or self-administered contract structure."
        );

        return new PermissionAnalysisResult(ownershipInfo, adminInfo, hasOwner, privilegedFunctions);
    }

    private String queryOwner(String contractAddress) {
        try {
            // Function selector 0x8da5cb5b -> owner()
            var callResult = rpcClient.ethCall(null, contractAddress, "0x8da5cb5b", "0");
            if (callResult.success() && callResult.returnData() != null && callResult.returnData().length() >= 66) {
                String hex = callResult.returnData().replace("0x", "");
                String addressPart = "0x" + hex.substring(24, 64);
                if (!addressPart.equalsIgnoreCase("0x0000000000000000000000000000000000000000")) {
                    return toChecksumAddress(addressPart);
                }
            }
        } catch (Exception e) {
            log.debug("owner() query failed on {}: {}", contractAddress, e.getMessage());
        }
        return null;
    }

    private String queryAdmin(String contractAddress) {
        try {
            // Function selector 0xf851a440 -> admin()
            var callResult = rpcClient.ethCall(null, contractAddress, "0xf851a440", "0");
            if (callResult.success() && callResult.returnData() != null && callResult.returnData().length() >= 66) {
                String hex = callResult.returnData().replace("0x", "");
                String addressPart = "0x" + hex.substring(24, 64);
                if (!addressPart.equalsIgnoreCase("0x0000000000000000000000000000000000000000")) {
                    return toChecksumAddress(addressPart);
                }
            }
        } catch (Exception e) {
            log.debug("admin() query failed on {}: {}", contractAddress, e.getMessage());
        }
        return null;
    }

    private String toChecksumAddress(String address) {
        return address.toLowerCase(); // Consistent lowercase format for clean display
    }

    public record PermissionAnalysisResult(
            OwnershipInfoDto ownershipInfo,
            AdminInfoDto adminInfo,
            boolean hasPrivilegedControl,
            List<String> privilegedFunctions
    ) {}
}
