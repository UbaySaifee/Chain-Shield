package com.chainshield.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record WalletAnalysisRequest(
        @NotBlank(message = "Wallet address must not be blank")
        @Pattern(
                regexp = "^0x[a-fA-F0-9]{40}$",
                message = "Invalid EVM address format. Must be a 40-character hex string prefixed with 0x."
        )
        String address,

        boolean includeCounterparties
) {}
