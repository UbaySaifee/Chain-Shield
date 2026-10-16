package com.chainshield.provider.model;

public record TransactionData(
        String from,
        String to,
        String valueWei,
        String calldata,
        String methodSelector,
        String methodSignature,
        boolean isApproval,
        String spenderAddress,
        boolean isUnlimitedApproval,
        String dataSource
) {}
