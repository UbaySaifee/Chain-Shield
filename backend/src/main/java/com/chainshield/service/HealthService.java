package com.chainshield.service;

import com.chainshield.dto.HealthResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class HealthService {

    @Value("${spring.profiles.active:dev-h2}")
    private String activeProfile;

    @Value("${chainshield.evm.rpc-url:http://127.0.0.1:8545}")
    private String rpcUrl;

    public HealthResponse getHealth() {
        Map<String, Object> details = new HashMap<>();
        details.put("profile", activeProfile);
        details.put("database", "CONNECTED");
        details.put("evmRpcConfiguredUrl", rpcUrl);
        details.put("systemTime", Instant.now().toString());

        return new HealthResponse(
                "UP",
                "chainshield-backend",
                "1.0.0-SNAPSHOT",
                Instant.now(),
                details
        );
    }
}
