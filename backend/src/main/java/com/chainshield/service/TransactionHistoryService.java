package com.chainshield.service;

import com.chainshield.dto.TransactionHistoryDto;
import com.chainshield.entity.SimulatedTransaction;
import com.chainshield.entity.TransactionGraphEdge;
import com.chainshield.repository.SimulatedTransactionRepository;
import com.chainshield.repository.TransactionGraphEdgeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class TransactionHistoryService {

    private final SimulatedTransactionRepository simulatedTransactionRepository;
    private final TransactionGraphEdgeRepository edgeRepository;

    public TransactionHistoryService(
            SimulatedTransactionRepository simulatedTransactionRepository,
            TransactionGraphEdgeRepository edgeRepository
    ) {
        this.simulatedTransactionRepository = simulatedTransactionRepository;
        this.edgeRepository = edgeRepository;
    }

    @Transactional(readOnly = true)
    public List<TransactionHistoryDto> getTransactionHistory(String typeFilter, Integer limit, Integer offset) {
        int maxLimit = limit != null && limit > 0 ? Math.min(limit, 200) : 50;
        int pageOffset = offset != null && offset >= 0 ? offset : 0;
        String filter = typeFilter != null ? typeFilter.trim().toUpperCase() : "ALL";

        List<TransactionHistoryDto> history = new ArrayList<>();

        if ("ALL".equals(filter) || "SIMULATION".equals(filter)) {
            List<SimulatedTransaction> sims = simulatedTransactionRepository.findAll();
            for (SimulatedTransaction sim : sims) {
                String status = sim.getSimulationStatus() != null ? sim.getSimulationStatus() : "UNKNOWN";
                String riskLevel = "REVERTED".equalsIgnoreCase(status) ? "CRITICAL" : "LOW";
                if (sim.getAllowanceDeltasJson() != null && sim.getAllowanceDeltasJson().contains("isUnlimited\":true")) {
                    riskLevel = "HIGH";
                }

                String functionName = "Simulation (eth_call)";
                if (sim.getCalldataHex() != null && sim.getCalldataHex().length() >= 10) {
                    String selector = sim.getCalldataHex().substring(0, 10).toLowerCase();
                    if ("0xa9059cbb".equals(selector)) functionName = "transfer(address,uint256)";
                    else if ("0x095ea7b3".equals(selector)) functionName = "approve(address,uint256)";
                    else if ("0x23b872dd".equals(selector)) functionName = "transferFrom(...)";
                    else if ("0xd0e30db0".equals(selector)) functionName = "deposit()";
                    else if ("0x2e1a7d4d".equals(selector)) functionName = "withdraw(uint256)";
                }

                history.add(new TransactionHistoryDto(
                        sim.getId().toString(),
                        "SIMULATION",
                        sim.getSimulatedAt(),
                        sim.getFromAddress(),
                        sim.getToAddress(),
                        functionName,
                        status,
                        riskLevel,
                        null,
                        "0 ETH (Gas est. ~" + (sim.getGasUsed() != null ? sim.getGasUsed() : 0) + ")",
                        "ETH",
                        sim.getRevertReason(),
                        sim.getGasUsed()
                ));
            }
        }

        if ("ALL".equals(filter) || "ON_CHAIN".equals(filter)) {
            List<TransactionGraphEdge> edges = edgeRepository.findAll();
            for (TransactionGraphEdge edge : edges) {
                String val = edge.getTokenAmount() != null && !edge.getTokenAmount().isBlank()
                        ? edge.getTokenAmount() + " " + edge.getTokenSymbol()
                        : edge.getValueEth() + " ETH";

                String functionName = edge.getFunctionName() != null && !edge.getFunctionName().isBlank()
                        ? edge.getFunctionName()
                        : edge.getRelationshipType();

                history.add(new TransactionHistoryDto(
                        edge.getTxHash() != null ? edge.getTxHash() : String.valueOf(edge.getId()),
                        "ON_CHAIN",
                        edge.getBlockTimestamp(),
                        edge.getFromAddress(),
                        edge.getToAddress(),
                        functionName,
                        "CONFIRMED",
                        "LOW",
                        edge.getTxHash(),
                        val,
                        edge.getTokenSymbol(),
                        null,
                        null
                ));
            }
        }

        // Sort by timestamp descending
        history.sort(Comparator.comparing(TransactionHistoryDto::timestamp, Comparator.nullsLast(Comparator.reverseOrder())));

        // Apply pagination
        if (pageOffset >= history.size()) {
            return List.of();
        }
        int toIndex = Math.min(pageOffset + maxLimit, history.size());
        return history.subList(pageOffset, toIndex);
    }
}
