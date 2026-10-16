package com.chainshield.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PathExplorationRequest(
        @NotBlank(message = "Source address must not be blank")
        @Pattern(regexp = "^0x[a-fA-F0-9]{40}$", message = "Source must be a valid 42-character EVM address")
        String sourceAddress,

        @NotBlank(message = "Target address must not be blank")
        @Pattern(regexp = "^0x[a-fA-F0-9]{40}$", message = "Target must be a valid 42-character EVM address")
        String targetAddress,

        Integer maxDepth
) {}
