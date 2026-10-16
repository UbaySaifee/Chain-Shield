package com.chainshield.contract.model;

import java.util.List;

public record FunctionDefinitionDto(
        String name,
        String signature,
        String selector,
        String stateMutability,
        List<String> inputs,
        boolean isPrivileged
) {}
