package com.chainshield.provider.model;

public record ContractData(
        String address,
        String name,
        boolean isBytecodePresent,
        int bytecodeSize,
        boolean isVerified,
        boolean hasOwnerOnlyMint,
        boolean hasBlacklist,
        boolean isTradingLocked,
        boolean hasDelegateCall,
        boolean hasSelfDestruct,
        String dataSource
) {}
