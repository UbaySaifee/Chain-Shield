package com.chainshield.dto;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(
        String type,
        String title,
        int status,
        String detail,
        String instance,
        Instant timestamp,
        Map<String, String> fieldErrors
) {
    public static ErrorResponse of(String title, int status, String detail, String instance) {
        return new ErrorResponse("about:blank", title, status, detail, instance, Instant.now(), null);
    }
}
