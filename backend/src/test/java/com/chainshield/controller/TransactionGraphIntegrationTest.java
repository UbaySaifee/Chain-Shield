package com.chainshield.controller;

import com.chainshield.graph.service.DemoTransactionGraphSeeder;
import org.junit.jupiter.api.BeforeEach;
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
class TransactionGraphIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DemoTransactionGraphSeeder demoSeeder;

    @BeforeEach
    void setUp() {
        demoSeeder.seedDemoDataset();
    }

    @Test
    @DisplayName("GET /api/address/{address}/summary should return comprehensive address intelligence")
    void testGetAddressSummarySuccess() throws Exception {
        mockMvc.perform(get("/api/address/" + DemoTransactionGraphSeeder.WALLET_A + "/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.address").value(DemoTransactionGraphSeeder.WALLET_A.toLowerCase()))
                .andExpect(jsonPath("$.accountType").value("EOA"))
                .andExpect(jsonPath("$.isContract").value(false))
                .andExpect(jsonPath("$.nativeBalanceEth").isNotEmpty())
                .andExpect(jsonPath("$.transactionCount").isNumber())
                .andExpect(jsonPath("$.uniqueCounterpartiesCount").isNumber())
                .andExpect(jsonPath("$.riskScore").isNumber())
                .andExpect(jsonPath("$.riskSeverity").isString())
                .andExpect(jsonPath("$.disclaimer").value(containsString("PROTOTYPE")))
                .andExpect(jsonPath("$.network").value(containsString("LOCAL_DEMO_NETWORK")));
    }

    @Test
    @DisplayName("GET /api/address/{address}/summary for known contract should reflect contract status")
    void testGetAddressSummaryContract() throws Exception {
        String mockErc20 = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        mockMvc.perform(get("/api/address/" + mockErc20 + "/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.address").value(mockErc20.toLowerCase()))
                .andExpect(jsonPath("$.accountType").value("CONTRACT"))
                .andExpect(jsonPath("$.isContract").value(true));
    }

    @Test
    @DisplayName("GET /api/address/{address}/graph with depth 1 should return center node and direct edges")
    void testGetGraphDepth1() throws Exception {
        mockMvc.perform(get("/api/address/" + DemoTransactionGraphSeeder.WALLET_A + "/graph")
                        .param("depth", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.centerAddress").value(DemoTransactionGraphSeeder.WALLET_A.toLowerCase()))
                .andExpect(jsonPath("$.depth").value(1))
                .andExpect(jsonPath("$.nodes").isArray())
                .andExpect(jsonPath("$.edges").isArray())
                .andExpect(jsonPath("$.nodes", hasSize(greaterThan(1))))
                .andExpect(jsonPath("$.edges", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.analytics.totalNodes").isNumber())
                .andExpect(jsonPath("$.analytics.totalEdges").isNumber())
                .andExpect(jsonPath("$.analytics.directCounterparties").isNumber())
                .andExpect(jsonPath("$.disclaimer").value(containsString("PROTOTYPE FORENSIC GRAPH")));
    }

    @Test
    @DisplayName("GET /api/address/{address}/graph with depth 2 should expand counterparty neighbors")
    void testGetGraphDepth2() throws Exception {
        mockMvc.perform(get("/api/address/" + DemoTransactionGraphSeeder.WALLET_A + "/graph")
                        .param("depth", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.depth").value(2))
                .andExpect(jsonPath("$.nodes", hasSize(greaterThanOrEqualTo(3))))
                .andExpect(jsonPath("$.edges", hasSize(greaterThanOrEqualTo(2))));
    }

    @Test
    @DisplayName("GET /api/address/{address}/graph with node filter WALLETS should omit contract nodes")
    void testGetGraphNodeFilterWallets() throws Exception {
        mockMvc.perform(get("/api/address/" + DemoTransactionGraphSeeder.WALLET_A + "/graph")
                        .param("depth", "2")
                        .param("nodeType", "WALLETS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodes[*].isContract", everyItem(is(false))));
    }

    @Test
    @DisplayName("GET /api/address/{address}/graph with edge filter TOKEN should return only token transfer edges")
    void testGetGraphEdgeFilterTokens() throws Exception {
        mockMvc.perform(get("/api/address/" + DemoTransactionGraphSeeder.WALLET_A + "/graph")
                        .param("depth", "2")
                        .param("edgeType", "TOKEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.edges[*].relationshipType", everyItem(is("TOKEN_TRANSFER"))));
    }

    @Test
    @DisplayName("GET /api/address/{address}/transactions should return list of normalized transactions")
    void testGetAddressTransactions() throws Exception {
        mockMvc.perform(get("/api/address/" + DemoTransactionGraphSeeder.WALLET_A + "/transactions")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$[0].txHash").isNotEmpty())
                .andExpect(jsonPath("$[0].from").isNotEmpty())
                .andExpect(jsonPath("$[0].to").isNotEmpty())
                .andExpect(jsonPath("$[0].relationshipType").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/graph/path should find multi-hop transaction path between Wallet A and Wallet C")
    void testPathExplorationPathExists() throws Exception {
        String payload = String.format("""
                {
                    "sourceAddress": "%s",
                    "targetAddress": "%s",
                    "maxDepth": 3
                }
                """, DemoTransactionGraphSeeder.WALLET_A, DemoTransactionGraphSeeder.WALLET_C);

        mockMvc.perform(post("/api/graph/path")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceAddress").value(DemoTransactionGraphSeeder.WALLET_A.toLowerCase()))
                .andExpect(jsonPath("$.targetAddress").value(DemoTransactionGraphSeeder.WALLET_C.toLowerCase()))
                .andExpect(jsonPath("$.pathFound").value(true))
                .andExpect(jsonPath("$.hops").value(greaterThan(0)))
                .andExpect(jsonPath("$.nodes").isArray())
                .andExpect(jsonPath("$.edges").isArray())
                .andExpect(jsonPath("$.disclaimer").value(containsString("PROTOTYPE PATH TRACER")));
    }

    @Test
    @DisplayName("POST /api/graph/path for identical source and target should return 0 hops")
    void testPathExplorationIdenticalAddresses() throws Exception {
        String payload = String.format("""
                {
                    "sourceAddress": "%s",
                    "targetAddress": "%s",
                    "maxDepth": 3
                }
                """, DemoTransactionGraphSeeder.WALLET_A, DemoTransactionGraphSeeder.WALLET_A);

        mockMvc.perform(post("/api/graph/path")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pathFound").value(true))
                .andExpect(jsonPath("$.hops").value(0))
                .andExpect(jsonPath("$.nodes", hasSize(1)));
    }

    @Test
    @DisplayName("POST /api/graph/path for disconnected address should report path not found")
    void testPathExplorationNoPath() throws Exception {
        String unconnected = "0x1111111111111111111111111111111111111111";
        String payload = String.format("""
                {
                    "sourceAddress": "%s",
                    "targetAddress": "%s",
                    "maxDepth": 2
                }
                """, DemoTransactionGraphSeeder.WALLET_A, unconnected);

        mockMvc.perform(post("/api/graph/path")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pathFound").value(false))
                .andExpect(jsonPath("$.hops").value(0))
                .andExpect(jsonPath("$.explanation").value(containsString("No direct or indirect transaction path")));
    }

    @Test
    @DisplayName("Security indicators: graph connection alone must NOT mark benign node as malicious")
    void testEvidenceGroundedSecurityIndicators() throws Exception {
        // Wallet A interacts with Wallet B which interacts with DangerousApprovalSpender.
        // Wallet A must NOT be marked CRITICAL merely because of this connection!
        mockMvc.perform(get("/api/address/" + DemoTransactionGraphSeeder.WALLET_A + "/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.riskScore").value(lessThan(70)))
                .andExpect(jsonPath("$.riskSeverity").value(oneOf("LOW", "MEDIUM")));
    }
}
