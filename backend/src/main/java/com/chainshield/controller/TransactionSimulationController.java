package com.chainshield.controller;

import com.chainshield.blockchain.client.EvmRpcClient;
import com.chainshield.blockchain.registry.DeployedContractRegistry;
import com.chainshield.dto.NetworkInfoDto;
import com.chainshield.dto.TransactionSimulationRequest;
import com.chainshield.dto.TransactionSimulationResponse;
import com.chainshield.simulation.TransactionSimulationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping
public class TransactionSimulationController {

    private final TransactionSimulationService simulationService;
    private final EvmRpcClient rpcClient;
    private final DeployedContractRegistry contractRegistry;
    private final com.chainshield.service.TransactionHistoryService historyService;

    public TransactionSimulationController(
            TransactionSimulationService simulationService,
            EvmRpcClient rpcClient,
            DeployedContractRegistry contractRegistry,
            com.chainshield.service.TransactionHistoryService historyService
    ) {
        this.simulationService = simulationService;
        this.rpcClient = rpcClient;
        this.contractRegistry = contractRegistry;
        this.historyService = historyService;
    }

    /**
     * Executes real pre-execution simulation (read-only eth_call) on the local EVM.
     * Maps to both /api/transaction/simulate and /api/v1/simulate for spec compliance.
     */
    @PostMapping({"/api/transaction/simulate", "/api/v1/simulate", "/api/v1/analyze/transaction/simulate"})
    public ResponseEntity<TransactionSimulationResponse> simulateTransaction(
            @Valid @RequestBody TransactionSimulationRequest request
    ) {
        return ResponseEntity.ok(simulationService.simulateTransaction(request));
    }

    /**
     * Returns the connection status of the local Hardhat blockchain node.
     */
    @GetMapping({"/api/blockchain/status", "/api/v1/blockchain/status"})
    public ResponseEntity<NetworkInfoDto> getBlockchainStatus() {
        boolean available = rpcClient.isAvailable();
        long chainId = available ? rpcClient.getChainId() : contractRegistry.getChainId();
        long blockNumber = available ? rpcClient.getBlockNumber() : 0L;

        return ResponseEntity.ok(new NetworkInfoDto(
                chainId,
                available ? "Hardhat Local EVM Sandbox" : "Local Demo Mock Mode (RPC Offline)",
                true,
                available,
                blockNumber,
                rpcClient.getRpcUrl()
        ));
    }

    /**
     * Retrieves all locally deployed testbed contracts and their metadata.
     */
    @GetMapping({"/api/blockchain/contracts", "/api/v1/blockchain/contracts"})
    public ResponseEntity<Map<String, Object>> getDeployedContracts() {
        return ResponseEntity.ok(Map.of(
                "network", contractRegistry.getNetwork(),
                "chainId", contractRegistry.getChainId(),
                "deployerAddress", contractRegistry.getDeployerAddress(),
                "testUserAddress", contractRegistry.getTestUserAddress(),
                "contracts", contractRegistry.getAllContracts()
        ));
    }

    /**
     * Queries on-chain receipt for a transaction hash.
     */
    @GetMapping({"/api/blockchain/receipt/{txHash}", "/api/v1/blockchain/receipt/{txHash}"})
    public ResponseEntity<?> getTransactionReceipt(@PathVariable String txHash) {
        var receipt = rpcClient.getTransactionReceipt(txHash);
        if (receipt == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(receipt);
    }

    /**
     * Retrieves unified transaction and simulation history.
     */
    @GetMapping({"/api/transactions/history", "/api/v1/transactions/history"})
    public ResponseEntity<List<com.chainshield.dto.TransactionHistoryDto>> getTransactionHistory(
            @RequestParam(required = false, defaultValue = "ALL") String type,
            @RequestParam(required = false, defaultValue = "50") Integer limit,
            @RequestParam(required = false, defaultValue = "0") Integer offset
    ) {
        return ResponseEntity.ok(historyService.getTransactionHistory(type, limit, offset));
    }
}
