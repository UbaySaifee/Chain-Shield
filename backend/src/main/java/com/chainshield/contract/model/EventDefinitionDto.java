package com.chainshield.contract.model;

import java.util.List;

public record EventDefinitionDto(
        String name,
        String signature,
        List<String> inputs
) {}
