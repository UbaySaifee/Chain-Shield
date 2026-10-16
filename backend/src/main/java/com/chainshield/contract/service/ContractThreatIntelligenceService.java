package com.chainshield.contract.service;

import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.chainshield.domain.Severity;
import com.chainshield.entity.KnownThreat;
import com.chainshield.repository.KnownThreatRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Service integrating local demo threat intelligence for contract addresses.
 * All indicators are explicitly grounded in the local testbed database with source = LOCAL_DEMO.
 */
@Service
public class ContractThreatIntelligenceService {

    private final KnownThreatRepository threatRepository;
    private final DeployedContractRegistry contractRegistry;

    public ContractThreatIntelligenceService(
            KnownThreatRepository threatRepository,
            DeployedContractRegistry contractRegistry
    ) {
        this.threatRepository = threatRepository;
        this.contractRegistry = contractRegistry;
    }

    public ThreatMatchResult checkThreatIntelligence(String address) {
        // 1. Query database threat registry
        Optional<KnownThreat> dbMatch = threatRepository.findByAddressIgnoreCase(address);
        if (dbMatch.isPresent()) {
            KnownThreat t = dbMatch.get();
            Severity sev = "CRITICAL".equalsIgnoreCase(t.getThreatType()) || t.getThreatType().contains("HONEYPOT")
                    ? Severity.CRITICAL : Severity.HIGH;
            return new ThreatMatchResult(
                    true,
                    "IND-W01",
                    t.getThreatType(),
                    t.getDescription(),
                    sev,
                    "LOCAL_DEMO"
            );
        }

        // 2. Query local deployed testbed registry
        Optional<DeployedContractRegistry.DeployedContractInfo> known = contractRegistry.findByAddress(address);
        if (known.isPresent()) {
            DeployedContractRegistry.DeployedContractInfo info = known.get();
            if ("MALICIOUS_HONEYPOT".equals(info.type())) {
                return new ThreatMatchResult(
                        true,
                        "IND-C03",
                        "HONEYPOT_FIXTURE",
                        "[DEMO FIXTURE] Deployed HoneypotToken testbed contract designed to demonstrate transfer lock interception.",
                        Severity.CRITICAL,
                        "LOCAL_DEMO"
                );
            } else if ("MALICIOUS_APPROVAL_SPENDER".equals(info.type())) {
                return new ThreatMatchResult(
                        true,
                        "IND-C08",
                        "APPROVAL_DRAINER_FIXTURE",
                        "[DEMO FIXTURE] Deployed DangerousApprovalSpender testbed contract designed to demonstrate allowance exploitation.",
                        Severity.HIGH,
                        "LOCAL_DEMO"
                );
            }
        }

        return new ThreatMatchResult(false, null, null, null, null, "LOCAL_DEMO");
    }

    public record ThreatMatchResult(
            boolean isMatch,
            String ruleId,
            String threatType,
            String description,
            Severity severity,
            String source
    ) {}
}
