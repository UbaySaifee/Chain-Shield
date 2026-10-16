package com.chainshield.provider.model;

import java.util.List;

public record WalletData(
        String address,
        int accountAgeDays,
        int transactionCount,
        int counterpartyCount,
        List<String> recentInteractions,
        boolean isContract,
        String dataSource
) {}
