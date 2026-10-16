package com.chainshield.contract;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev-h2")
class ContractAnalysisIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("MockERC20 contract analysis should detect ERC-20 standard, ownership, and mint capability")
    void testAnalyzeMockERC20() throws Exception {
        String jsonPayload = """
                {
                    "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
                    "chainId": 31337
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/contract/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targetAddress", equalToIgnoringCase("0x5FbDB2315678afecb367f032d93F642f64180aa3")))
                .andExpect(jsonPath("$.accountClassification").value("CONTRACT"))
                .andExpect(jsonPath("$.codeExists").value(true))
                .andExpect(jsonPath("$.contractMetadata.contractName").value("ShieldToken"))
                .andExpect(jsonPath("$.contractMetadata.sourceVerified").value(true))
                .andExpect(jsonPath("$.abiInfo.abiAvailable").value(true))
                .andExpect(jsonPath("$.ownershipInfo.ownerDetected").value(true))
                .andExpect(jsonPath("$.capabilities[*].name", hasItems("TOKEN_STANDARD_ERC20", "TOKEN_APPROVAL", "OWNERSHIP_CONTROL", "MINT_CAPABILITY")))
                .andExpect(jsonPath("$.disclaimer", containsStringIgnoringCase("prototype")))
                .andReturn();

        JsonNode responseNode = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(responseNode.get("score").asInt()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("SafeVault contract analysis should detect escrow/vault capabilities and owner control")
    void testAnalyzeSafeVault() throws Exception {
        String jsonPayload = """
                {
                    "contractAddress": "0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0",
                    "chainId": 31337
                }
                """;

        mockMvc.perform(post("/api/contract/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountClassification").value("CONTRACT"))
                .andExpect(jsonPath("$.contractMetadata.contractName").value("SafeVault"))
                .andExpect(jsonPath("$.abiInfo.abiAvailable").value(true))
                .andExpect(jsonPath("$.capabilities[*].name", hasItems("ESCROW_VAULT", "OWNERSHIP_CONTROL")))
                .andExpect(jsonPath("$.severity").value(anyOf(is("LOW"), is("MEDIUM"))));
    }

    @Test
    @DisplayName("DangerousApprovalSpender analysis should detect high risk drainer capability and threat indicator")
    void testAnalyzeDangerousApprovalSpender() throws Exception {
        String jsonPayload = """
                {
                    "contractAddress": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
                    "chainId": 31337
                }
                """;

        mockMvc.perform(post("/api/contract/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountClassification").value("CONTRACT"))
                .andExpect(jsonPath("$.contractMetadata.contractName").value("DangerousApprovalSpender"))
                .andExpect(jsonPath("$.capabilities[*].name", hasItem("EXTERNAL_ASSET_SIPHON")))
                .andExpect(jsonPath("$.indicators[*].code", hasItem("IND-C08")))
                .andExpect(jsonPath("$.score").value(greaterThanOrEqualTo(60)));
    }

    @Test
    @DisplayName("HoneypotToken analysis should flag blacklist capability, owner lock, and local threat match")
    void testAnalyzeHoneypotToken() throws Exception {
        String jsonPayload = """
                {
                    "contractAddress": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
                    "chainId": 31337
                }
                """;

        mockMvc.perform(post("/api/contract/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountClassification").value("CONTRACT"))
                .andExpect(jsonPath("$.contractMetadata.contractName").value("TrapToken"))
                .andExpect(jsonPath("$.capabilities[*].name", hasItems("TOKEN_STANDARD_ERC20", "BLACKLIST_CAPABILITY", "OWNERSHIP_CONTROL")))
                .andExpect(jsonPath("$.score").value(greaterThanOrEqualTo(75)))
                .andExpect(jsonPath("$.severity").value(anyOf(is("HIGH"), is("CRITICAL"))));
    }



    @Test
    @DisplayName("EOA address should be identified as EOA and not analyzed as a contract")
    void testAnalyzeEOA() throws Exception {
        // An address not in testbed registry with no code
        String jsonPayload = """
                {
                    "contractAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                    "chainId": 31337
                }
                """;

        mockMvc.perform(post("/api/contract/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountClassification").value("EOA"))
                .andExpect(jsonPath("$.codeExists").value(false))
                .andExpect(jsonPath("$.score").value(0))
                .andExpect(jsonPath("$.severity").value("LOW"))
                .andExpect(jsonPath("$.summary").value(containsString("Externally Owned Account")));
    }

    @Test
    @DisplayName("Invalid address should return 400 Bad Request with validation message")
    void testAnalyzeInvalidAddress() throws Exception {
        String jsonPayload = """
                {
                    "contractAddress": "0xnotanaddress",
                    "chainId": 31337
                }
                """;

        mockMvc.perform(post("/api/contract/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("validation")));
    }

    @Test
    @DisplayName("GET /api/analyses?type=CONTRACT should filter and return only contract analyses")
    void testGetAnalysesFilterByType() throws Exception {
        // Run contract analysis
        String jsonPayload = """
                {
                    "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
                    "chainId": 31337
                }
                """;

        mockMvc.perform(post("/api/contract/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/analyses?type=CONTRACT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)))
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].targetType").value("CONTRACT"));
    }
}
