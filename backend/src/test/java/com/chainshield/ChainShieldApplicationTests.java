package com.chainshield;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("dev-h2")
class ChainShieldApplicationTests {

    @Test
    void contextLoads() {
        // Confirms Spring application context initializes cleanly with in-memory H2
    }
}
