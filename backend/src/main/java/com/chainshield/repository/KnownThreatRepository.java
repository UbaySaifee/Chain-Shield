package com.chainshield.repository;

import com.chainshield.entity.KnownThreat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface KnownThreatRepository extends JpaRepository<KnownThreat, Long> {
    Optional<KnownThreat> findByAddressIgnoreCase(String address);
    boolean existsByAddressIgnoreCase(String address);
}
