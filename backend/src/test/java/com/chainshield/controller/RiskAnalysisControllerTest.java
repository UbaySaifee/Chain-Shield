package com.chainshield.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev-h2")
class RiskAnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /api/wallet/analyze with valid address should return 200 and risk assessment")
    void testAnalyzeWalletValid() throws Exception {
        String jsonPayload = """
                {
                    "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                    "chainId": 31337
                }
                """;

        mockMvc.perform(post("/api/wallet/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.targetAddress").value("0x70997970C51812dc3A010C7d01b50e0d17dc79C8"))
                .andExpect(jsonPath("$.targetType").value("WALLET"))
                .andExpect(jsonPath("$.score").isNumber())
                .andExpect(jsonPath("$.severity").isString())
                .andExpect(jsonPath("$.summary").isString())
                .andExpect(jsonPath("$.disclaimer").value(containsString("PROTOTYPE")))
                .andExpect(jsonPath("$.indicators").isArray())
                .andExpect(jsonPath("$.recommendations").isArray());
    }

    @Test
    @DisplayName("POST /api/wallet/analyze with invalid EVM address should return 400 Bad Request")
    void testAnalyzeWalletInvalidAddress() throws Exception {
        String jsonPayload = """
                {
                    "address": "invalid-address-string",
                    "chainId": 31337
                }
                """;

        mockMvc.perform(post("/api/wallet/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detail").value(containsString("validation")));
    }

    @Test
    @DisplayName("POST /api/contract/analyze for Honeypot contract should return HIGH/CRITICAL risk")
    void testAnalyzeContractHoneypot() throws Exception {
        String jsonPayload = """
                {
                    "contractAddress": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
                    "chainId": 31337
                }
                """;

        mockMvc.perform(post("/api/contract/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targetAddress").value("0x5fbdb2315678afecb367f032d93f642f64180aa3"))
                .andExpect(jsonPath("$.targetType").value("CONTRACT"))
                .andExpect(jsonPath("$.score").value(greaterThanOrEqualTo(70)))
                .andExpect(jsonPath("$.severity").value(anyOf(is("HIGH"), is("CRITICAL"))))
                .andExpect(jsonPath("$.indicators", hasSize(greaterThanOrEqualTo(2))));
    }

    @Test
    @DisplayName("POST /api/transaction/analyze with unlimited approval calldata should detect risk")
    void testAnalyzeTransactionUnlimitedApproval() throws Exception {
        String calldata = "0x095ea7b3000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

        String jsonPayload = String.format("""
                {
                    "fromAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                    "toAddress": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
                    "valueWei": "0",
                    "calldata": "%s",
                    "chainId": 31337
                }
                """, calldata);

        mockMvc.perform(post("/api/transaction/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targetType").value("TRANSACTION"))
                .andExpect(jsonPath("$.indicators[*].code", hasItem("IND-T01")))
                .andExpect(jsonPath("$.score").value(greaterThanOrEqualTo(35)));
    }

    @Test
    @DisplayName("GET /api/analyses should return persisted analysis history")
    void testGetAnalysesHistory() throws Exception {
        // Trigger one analysis first to guarantee at least one record
        String jsonPayload = """
                {
                    "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                    "chainId": 31337
                }
                """;

        mockMvc.perform(post("/api/wallet/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/analyses")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)))
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].id").isNotEmpty())
                .andExpect(jsonPath("$[0].targetAddress").isNotEmpty())
                .andExpect(jsonPath("$[0].score").isNumber());
    }

    @Test
    @DisplayName("GET /api/analyses/{id} with existing ID returns 200, with non-existent ID returns 404")
    void testGetAnalysisByIdAndNotFound() throws Exception {
        // 1. Create an analysis
        String jsonPayload = """
                {
                    "contractAddress": "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0",
                    "chainId": 31337
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/contract/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode responseNode = objectMapper.readTree(result.getResponse().getContentAsString());
        String analysisId = responseNode.get("id").asText();

        // 2. Query by ID -> 200 OK
        mockMvc.perform(get("/api/analyses/" + analysisId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(analysisId))
                .andExpect(jsonPath("$.targetAddress").value("0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0"));

        // 3. Query non-existent UUID -> 404 Not Found
        UUID randomId = UUID.randomUUID();
        mockMvc.perform(get("/api/analyses/" + randomId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value(containsString("not found")));
    }
}
