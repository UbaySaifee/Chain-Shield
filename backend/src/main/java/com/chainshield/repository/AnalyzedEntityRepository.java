package com.chainshield.repository;

import com.chainshield.entity.AnalyzedEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AnalyzedEntityRepository extends JpaRepository<AnalyzedEntity, Long> {
    Optional<AnalyzedEntity> findByAddressIgnoreCase(String address);
    boolean existsByAddressIgnoreCase(String address);
}
