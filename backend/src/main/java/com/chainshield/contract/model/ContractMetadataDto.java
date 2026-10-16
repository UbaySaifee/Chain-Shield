package com.chainshield.contract.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ContractMetadataDto(
        String name,
        String symbol,
        Integer decimals,
        String totalSupplyFormatted,
        boolean isErc20,
        int bytecodeSizeBytes,
        String sourceStatus,       // "LOCAL_VERIFIED", "SOURCE_UNAVAILABLE", "EXTERNAL_UNVERIFIED"
        boolean isBytecodePresent,
        String deployedBytecodeSnippet,
        String compilerVersion,
        String license
) {
    @JsonProperty("contractName")
    public String contractName() {
        return name;
    }

    @JsonProperty("sourceVerified")
    public boolean sourceVerified() {
        return "LOCAL_VERIFIED".equalsIgnoreCase(sourceStatus);
    }
}

