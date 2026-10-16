package com.chainshield.repository;

import com.chainshield.entity.TransactionGraphEdge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface TransactionGraphEdgeRepository extends JpaRepository<TransactionGraphEdge, Long> {

    List<TransactionGraphEdge> findByFromAddressIgnoreCase(String fromAddress);

    List<TransactionGraphEdge> findByToAddressIgnoreCase(String toAddress);

    List<TransactionGraphEdge> findByFromAddressIgnoreCaseOrToAddressIgnoreCase(String fromAddress, String toAddress);

    List<TransactionGraphEdge> findByFromAddressIgnoreCaseInOrToAddressIgnoreCaseIn(
            Collection<String> fromAddresses,
            Collection<String> toAddresses
    );

    @Query("SELECT e FROM TransactionGraphEdge e WHERE LOWER(e.fromAddress) = LOWER(:address) OR LOWER(e.toAddress) = LOWER(:address) ORDER BY e.blockTimestamp DESC")
    List<TransactionGraphEdge> findDirectTransactionsForAddress(@Param("address") String address);

    long countByFromAddressIgnoreCaseOrToAddressIgnoreCase(String fromAddress, String toAddress);

    long countByFromAddressIgnoreCase(String fromAddress);

    long countByToAddressIgnoreCase(String toAddress);

    List<TransactionGraphEdge> findTop20ByOrderByBlockTimestampDesc();

    List<TransactionGraphEdge> findAllByOrderByBlockTimestampDesc();

    boolean existsByTxHash(String txHash);
}
