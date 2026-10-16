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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev-h2")
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/v1/dashboard/stats should return comprehensive dashboard metrics")
    void testGetDashboardStats() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/stats")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalScannedEntities").isNumber())
                .andExpect(jsonPath("$.highRiskDetectedCount").isNumber())
                .andExpect(jsonPath("$.simulationsExecuted").isNumber())
                .andExpect(jsonPath("$.activeThreatIndicatorsCount").isNumber())
                .andExpect(jsonPath("$.riskDistribution").isMap())
                .andExpect(jsonPath("$.riskDistribution.LOW").isNumber())
                .andExpect(jsonPath("$.riskDistribution.MEDIUM").isNumber())
                .andExpect(jsonPath("$.riskDistribution.HIGH").isNumber())
                .andExpect(jsonPath("$.riskDistribution.CRITICAL").isNumber())
                .andExpect(jsonPath("$.recentAssessments").isArray())
                .andExpect(jsonPath("$.walletAnalysesCount").isNumber())
                .andExpect(jsonPath("$.contractAnalysesCount").isNumber())
                .andExpect(jsonPath("$.transactionAnalysesCount").isNumber())
                .andExpect(jsonPath("$.recentSimulations").isArray())
                .andExpect(jsonPath("$.recentTransactions").isArray())
                .andExpect(jsonPath("$.recentAddresses").isArray())
                .andExpect(jsonPath("$.recentIndicators").isArray());
    }

    @Test
    @DisplayName("GET /api/v1/transactions/history should return transaction and simulation history")
    void testGetTransactionHistory() throws Exception {
        mockMvc.perform(get("/api/v1/transactions/history")
                        .param("type", "ALL")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
