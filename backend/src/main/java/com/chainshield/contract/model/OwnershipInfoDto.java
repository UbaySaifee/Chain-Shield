package com.chainshield.contract.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record OwnershipInfoDto(
        boolean hasOwner,
        String ownerAddress,
        String privilegeType,
        List<String> callableFunctions,
        String whyItMatters
) {
    @JsonProperty("ownerDetected")
    public boolean ownerDetected() {
        return hasOwner;
    }
}

