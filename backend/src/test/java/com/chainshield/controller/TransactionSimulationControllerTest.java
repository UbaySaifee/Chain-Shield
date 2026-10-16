package com.chainshield.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev-h2")
class TransactionSimulationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Scenario A - Safe Token Transfer simulation succeeds with low risk and dual balance deltas (Sender & Recipient)")
    void testScenarioASafeTokenTransfer() throws Exception {
        // transfer(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 250 SHLD)
        String calldata = "0xa9059cbb"
                + "0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc"
                + "00000000000000000000000000000000000000000000000d8d726b7177a80000";

        String jsonPayload = String.format("""
                {
                    "fromAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                    "toAddress": "0x1111111111111111111111111111111111111111",
                    "valueWei": "0",
                    "calldata": "%s",
                    "chainId": 31337
                }
                """, calldata);

        mockMvc.perform(post("/api/transaction/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.simulationStatus").value("SUCCESS"))
                .andExpect(jsonPath("$.decodedCall.actionType").value("ERC-20 Token Transfer"))
                .andExpect(jsonPath("$.decodedCall.functionSignature").value("transfer(address,uint256)"))
                .andExpect(jsonPath("$.stateEffects.balanceDeltas", hasSize(2)))
                .andExpect(jsonPath("$.stateEffects.balanceDeltas[0].accountAddress").value(equalToIgnoringCase("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")))
                .andExpect(jsonPath("$.stateEffects.balanceDeltas[0].formattedDelta").value(containsString("-250")))
                .andExpect(jsonPath("$.stateEffects.balanceDeltas[1].accountAddress").value(equalToIgnoringCase("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")))
                .andExpect(jsonPath("$.stateEffects.balanceDeltas[1].formattedDelta").value(containsString("+250")))
                .andExpect(jsonPath("$.stateEffects.projectedEvents", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.stateEffects.projectedEvents[0]").value(containsString("Transfer")))
                .andExpect(jsonPath("$.riskAssessment.score").value(lessThan(40)))
                .andExpect(jsonPath("$.networkInfo.chainId").value(31337));
    }

    @Test
    @DisplayName("Scenario A - Safe Token Transfer accepts JSON aliases (from, to, data)")
    void testScenarioASafeTokenTransferWithJsonAliases() throws Exception {
        String calldata = "0xa9059cbb"
                + "0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc"
                + "00000000000000000000000000000000000000000000000d8d726b7177a80000";

        String jsonPayload = String.format("""
                {
                    "from": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                    "to": "0x1111111111111111111111111111111111111111",
                    "valueWei": "0",
                    "data": "%s",
                    "chainId": 31337
                }
                """, calldata);

        mockMvc.perform(post("/api/transaction/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.simulationStatus").value("SUCCESS"))
                .andExpect(jsonPath("$.stateEffects.balanceDeltas", hasSize(2)));
    }

    @Test
    @DisplayName("Self-Transfer Simulation records 0 net delta without duplicating account")
    void testSelfTransferSimulation() throws Exception {
        String calldata = "0xa9059cbb"
                + "00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8"
                + "00000000000000000000000000000000000000000000000d8d726b7177a80000";

        String jsonPayload = String.format("""
                {
                    "from": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                    "to": "0x1111111111111111111111111111111111111111",
                    "valueWei": "0",
                    "data": "%s",
                    "chainId": 31337
                }
                """, calldata);

        mockMvc.perform(post("/api/transaction/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.simulationStatus").value("SUCCESS"))
                .andExpect(jsonPath("$.stateEffects.balanceDeltas", hasSize(1)))
                .andExpect(jsonPath("$.stateEffects.balanceDeltas[0].formattedDelta").value("0.0 TOKEN"));
    }

    @Test
    @DisplayName("Scenario B - Unlimited Token Approval detects high risk and triggers IND-T01")
    void testScenarioBUnlimitedTokenApproval() throws Exception {
        // approve(0x2222222222222222222222222222222222222222, MAX_UINT256)
        String calldata = "0x095ea7b3"
                + "0000000000000000000000002222222222222222222222222222222222222222"
                + "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

        String jsonPayload = String.format("""
                {
                    "fromAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                    "toAddress": "0x1111111111111111111111111111111111111111",
                    "valueWei": "0",
                    "calldata": "%s",
                    "chainId": 31337
                }
                """, calldata);

        mockMvc.perform(post("/api/transaction/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.simulationStatus").value("SUCCESS"))
                .andExpect(jsonPath("$.decodedCall.isUnlimitedApproval").value(true))
                .andExpect(jsonPath("$.stateEffects.allowanceDeltas", hasSize(1)))
                .andExpect(jsonPath("$.stateEffects.allowanceDeltas[0].isUnlimited").value(true))
                .andExpect(jsonPath("$.riskAssessment.score").value(greaterThanOrEqualTo(35)))
                .andExpect(jsonPath("$.riskAssessment.indicators[*].code", hasItem("IND-T01")));
    }

    @Test
    @DisplayName("Scenario C - Interacting with Honeypot Contract triggers critical threat indicator IND-W01 / IND-C03")
    void testScenarioCApprovalToDangerousSpender() throws Exception {
        // Interacting with 0x5FbDB2315678afecb367f032d93F642f64180aa3 (seeded Honeypot threat)
        String calldata = "0x095ea7b3"
                + "000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512"
                + "00000000000000000000000000000000000000000000003635c9adc5dea00000";

        String jsonPayload = String.format("""
                {
                    "fromAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                    "toAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
                    "valueWei": "0",
                    "calldata": "%s",
                    "chainId": 31337
                }
                """, calldata);

        mockMvc.perform(post("/api/transaction/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.riskAssessment.score").value(greaterThanOrEqualTo(80)))
                .andExpect(jsonPath("$.riskAssessment.severity").value("CRITICAL"))
                .andExpect(jsonPath("$.riskAssessment.indicators[*].code", hasItem("IND-W01")));
    }

    @Test
    @DisplayName("Scenario D - Honeypot Token transfer triggers REVERTED status and honeypot lock indicator")
    void testScenarioDHoneypotTransferRevert() throws Exception {
        // Transfer on HoneypotToken: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
        String calldata = "0xa9059cbb"
                + "0000000000000000000000002222222222222222222222222222222222222222"
                + "0000000000000000000000000000000000000000000000008ac7230489e80000";

        String jsonPayload = String.format("""
                {
                    "fromAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                    "toAddress": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
                    "valueWei": "0",
                    "calldata": "%s",
                    "chainId": 31337
                }
                """, calldata);

        mockMvc.perform(post("/api/transaction/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.simulationStatus").value("REVERTED"))
                .andExpect(jsonPath("$.revertReason").value(containsString("HONEYPOT")))
                .andExpect(jsonPath("$.riskAssessment.severity").value("CRITICAL"))
                .andExpect(jsonPath("$.riskAssessment.indicators[*].code", hasItem("IND-C03")));
    }

    @Test
    @DisplayName("POST /api/transaction/simulate with invalid EVM address returns 400 Bad Request")
    void testSimulateInvalidAddress() throws Exception {
        String jsonPayload = """
                {
                    "fromAddress": "bad-address",
                    "toAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
                }
                """;

        mockMvc.perform(post("/api/transaction/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detail").value(containsString("validation")));
    }

    @Test
    @DisplayName("GET /api/blockchain/status returns local devnet connectivity and chain ID")
    void testGetBlockchainStatus() throws Exception {
        mockMvc.perform(get("/api/blockchain/status")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chainId").value(31337))
                .andExpect(jsonPath("$.isLocalDevnet").value(true))
                .andExpect(jsonPath("$.rpcConnected").value(true))
                .andExpect(jsonPath("$.rpcAvailable").value(true))
                .andExpect(jsonPath("$.rpcEndpoint").isNotEmpty())
                .andExpect(jsonPath("$.rpcUrl").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/blockchain/contracts returns deployed testbed registry")
    void testGetDeployedContracts() throws Exception {
        mockMvc.perform(get("/api/blockchain/contracts")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chainId").value(31337))
                .andExpect(jsonPath("$.contracts", hasSize(greaterThanOrEqualTo(4))));
    }
}
