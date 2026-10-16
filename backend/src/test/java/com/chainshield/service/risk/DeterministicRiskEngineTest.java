package com.chainshield.service.risk;

import com.chainshield.domain.EvaluationResult;
import com.chainshield.domain.RiskCategory;
import com.chainshield.entity.KnownThreat;
import com.chainshield.provider.model.ContractData;
import com.chainshield.provider.model.TransactionData;
import com.chainshield.provider.model.WalletData;
import com.chainshield.repository.KnownThreatRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

class DeterministicRiskEngineTest {

    private KnownThreatRepository knownThreatRepository;
    private DeterministicRiskEngine riskEngine;

    @BeforeEach
    void setUp() {
        knownThreatRepository = Mockito.mock(KnownThreatRepository.class);
        riskEngine = new DeterministicRiskEngine(knownThreatRepository);
    }

    @Test
    @DisplayName("Benign wallet with no threat records should produce LOW risk score")
    void testBenignWalletEvaluation() {
        when(knownThreatRepository.findByAddressIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(knownThreatRepository.existsByAddressIgnoreCase(anyString())).thenReturn(false);

        WalletData wallet = new WalletData(
                "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                90,
                15,
                6,
                Collections.emptyList(),
                false,
                "DEMO"
        );

        EvaluationResult result = riskEngine.evaluateWallet(wallet);

        assertThat(result.score()).isLessThan(30);
        assertThat(result.category()).isEqualTo(RiskCategory.LOW);
        assertThat(result.indicators()).isEmpty();
        assertThat(result.summary()).contains("LOW RISK");
    }

    @Test
    @DisplayName("Wallet matched against known threat list should produce CRITICAL risk score")
    void testThreatMatchedWalletEvaluation() {
        KnownThreat mixerThreat = new KnownThreat(
                "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                "ILLICIT_MIXER",
                "Local Threat Feed",
                "Simulated Privacy Mixer",
                100
        );

        when(knownThreatRepository.findByAddressIgnoreCase("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"))
                .thenReturn(Optional.of(mixerThreat));

        WalletData wallet = new WalletData(
                "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                120,
                200,
                150,
                Collections.emptyList(),
                false,
                "DEMO"
        );

        EvaluationResult result = riskEngine.evaluateWallet(wallet);

        assertThat(result.score()).isGreaterThanOrEqualTo(85);
        assertThat(result.category()).isEqualTo(RiskCategory.CRITICAL);
        assertThat(result.indicators()).hasSize(1);
        assertThat(result.indicators().get(0).code()).isEqualTo("IND-W01");
    }

    @Test
    @DisplayName("Honeypot contract with locked trading should produce CRITICAL risk score")
    void testHoneypotContractEvaluation() {
        when(knownThreatRepository.findByAddressIgnoreCase(anyString())).thenReturn(Optional.empty());

        ContractData honeypot = new ContractData(
                "0x5FbDB2315678afecb367f032d93F642f64180aa3",
                "HoneypotToken",
                true,
                3840,
                false, // unverified (weight 15 * 1.0 = 15)
                false,
                true,  // hasBlacklist (weight 25 * 1.5 = 38)
                true,  // tradingLocked (weight 50 * 2.0 = 100)
                false,
                false,
                "DEMO"
        );

        EvaluationResult result = riskEngine.evaluateContract(honeypot);

        assertThat(result.score()).isEqualTo(100); // capped at 100
        assertThat(result.category()).isEqualTo(RiskCategory.CRITICAL);
        assertThat(result.indicators()).anyMatch(i -> i.code().equals("IND-C03"));
        assertThat(result.recommendations()).anyMatch(r -> r.contains("Do NOT buy or swap this token"));
    }

    @Test
    @DisplayName("Verified benign contract should evaluate to LOW risk")
    void testSafeContractEvaluation() {
        when(knownThreatRepository.findByAddressIgnoreCase(anyString())).thenReturn(Optional.empty());

        ContractData safe = new ContractData(
                "0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0",
                "SafeVault",
                true,
                2100,
                true, // verified
                false,
                false,
                false,
                false,
                false,
                "DEMO"
        );

        EvaluationResult result = riskEngine.evaluateContract(safe);

        assertThat(result.score()).isEqualTo(0);
        assertThat(result.category()).isEqualTo(RiskCategory.LOW);
        assertThat(result.indicators()).isEmpty();
    }

    @Test
    @DisplayName("Unlimited token approval transaction should evaluate to HIGH risk")
    void testUnlimitedApprovalTransactionEvaluation() {
        when(knownThreatRepository.existsByAddressIgnoreCase(anyString())).thenReturn(false);

        TransactionData tx = new TransactionData(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
                "0",
                "0x095ea7b3...",
                "0x095ea7b3",
                "approve(address,uint256)",
                true,
                "0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0",
                true, // isUnlimitedApproval
                "DEMO"
        );

        EvaluationResult result = riskEngine.evaluateTransaction(tx);

        assertThat(result.score()).isBetween(50, 84);
        assertThat(result.category()).isIn(RiskCategory.MEDIUM, RiskCategory.HIGH);
        assertThat(result.indicators()).anyMatch(i -> i.code().equals("IND-T01"));
        assertThat(result.recommendations()).anyMatch(r -> r.contains("Reduce allowance"));
    }

    @Test
    @DisplayName("Boundary scores should strictly stay within [0, 100]")
    void testScoreBoundaries() {
        when(knownThreatRepository.findByAddressIgnoreCase(anyString())).thenReturn(Optional.empty());

        // Extreme scenario with all threat flags triggered
        ContractData extremeThreat = new ContractData(
                "0x0000000000000000000000000000000000000001",
                "ExtremeThreat",
                true,
                5000,
                false,
                true,
                true,
                true,
                true,
                true,
                "DEMO"
        );

        EvaluationResult result = riskEngine.evaluateContract(extremeThreat);

        assertThat(result.score()).isLessThanOrEqualTo(100);
        assertThat(result.score()).isGreaterThanOrEqualTo(0);
        assertThat(result.category()).isEqualTo(RiskCategory.CRITICAL);
    }
}
