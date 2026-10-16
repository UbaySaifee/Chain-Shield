package com.chainshield.contract.model;

import java.util.List;

public record AbiInfoDto(
        boolean abiAvailable,
        String contractName,
        int functionsCount,
        int eventsCount,
        List<FunctionDefinitionDto> functions,
        List<EventDefinitionDto> events,
        List<String> detectedInterfaces
) {}
