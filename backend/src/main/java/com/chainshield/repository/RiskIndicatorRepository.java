package com.chainshield.repository;

import com.chainshield.entity.RiskIndicator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RiskIndicatorRepository extends JpaRepository<RiskIndicator, Long> {
    Optional<RiskIndicator> findByCode(String code);
}
