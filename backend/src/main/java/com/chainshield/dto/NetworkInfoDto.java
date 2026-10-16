package com.chainshield.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record NetworkInfoDto(
        long chainId,
        String networkName,
        @JsonProperty("isLocalDevnet") boolean isLocalDevnet,
        @JsonProperty("rpcConnected") boolean rpcConnected,
        @JsonProperty("currentBlock") long currentBlock,
        @JsonProperty("rpcEndpoint") String rpcEndpoint
) {
    @JsonProperty("isLocalDemo")
    public boolean isLocalDemo() {
        return isLocalDevnet;
    }

    @JsonProperty("rpcAvailable")
    public boolean rpcAvailable() {
        return rpcConnected;
    }

    @JsonProperty("blockNumber")
    public long blockNumber() {
        return currentBlock;
    }

    @JsonProperty("rpcUrl")
    public String rpcUrl() {
        return rpcEndpoint;
    }
}
