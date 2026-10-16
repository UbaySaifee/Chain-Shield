package com.chainshield.repository;

import com.chainshield.entity.SimulatedTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SimulatedTransactionRepository extends JpaRepository<SimulatedTransaction, UUID> {
    List<SimulatedTransaction> findTop10ByOrderBySimulatedAtDesc();
}
