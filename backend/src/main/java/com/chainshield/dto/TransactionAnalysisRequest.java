package com.chainshield.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TransactionAnalysisRequest(
        @NotBlank(message = "Sender address must not be blank")
        @Pattern(
                regexp = "^0x[a-fA-F0-9]{40}$",
                message = "Invalid EVM sender address format. Must be a 40-character hex string prefixed with 0x."
        )
        String fromAddress,

        @NotBlank(message = "Recipient or contract address must not be blank")
        @Pattern(
                regexp = "^0x[a-fA-F0-9]{40}$",
                message = "Invalid EVM recipient address format. Must be a 40-character hex string prefixed with 0x."
        )
        String toAddress,

        @Pattern(
                regexp = "^[0-9]+$",
                message = "Value in Wei must be a non-negative integer string."
        )
        String valueWei,

        @Pattern(
                regexp = "^(0x([a-fA-F0-9]{2})*)?$",
                message = "Calldata must be a valid hex string starting with 0x with an even number of hex digits."
        )
        String calldata,

        Long gasLimit
) {
    public TransactionAnalysisRequest {
        if (valueWei == null || valueWei.isBlank()) {
            valueWei = "0";
        }
        if (calldata == null || calldata.isBlank()) {
            calldata = "0x";
        }
    }
}
