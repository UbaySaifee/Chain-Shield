package com.chainshield.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TransactionSimulationRequest(
        @NotBlank(message = "Sender 'fromAddress' is required.")
        @Pattern(regexp = "^0x[0-9a-fA-F]{40}$", message = "Sender address must be a valid 40-character hexadecimal EVM address prefixed with '0x'.")
        @JsonAlias({"from", "sender", "fromAddress"})
        String fromAddress,

        @NotBlank(message = "Destination 'toAddress' is required.")
        @Pattern(regexp = "^0x[0-9a-fA-F]{40}$", message = "Destination address must be a valid 40-character hexadecimal EVM address prefixed with '0x'.")
        @JsonAlias({"to", "target", "toAddress"})
        String toAddress,

        String valueWei,

        @JsonAlias({"data", "calldataHex", "calldata"})
        String calldata,

        Long chainId
) {
    public TransactionSimulationRequest {
        if (valueWei == null || valueWei.isBlank()) valueWei = "0";
        if (calldata == null || calldata.isBlank()) calldata = "0x";
        if (chainId == null) chainId = 31337L;
    }
}
