package com.chainshield.contract.model;

public record ProxyInfoDto(
        String proxyDetected,            // "YES", "NO", "UNKNOWN"
        String implementationAddress,    // 0x... or "None / Unknown"
        String adminAddress,             // 0x... or "None / Unknown"
        String upgradeabilityDetected,   // "Detected", "Not detected", "Unknown"
        String proxyType,                // "EIP-1967 Transparent Proxy", "UUPS Proxy", "Heuristic Delegatecall Forwarder", "None"
        boolean isHeuristicIndicator
) {}
