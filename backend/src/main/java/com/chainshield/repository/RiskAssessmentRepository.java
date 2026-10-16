package com.chainshield.repository;

import com.chainshield.entity.RiskAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RiskAssessmentRepository extends JpaRepository<RiskAssessment, UUID> {
    List<RiskAssessment> findAllByOrderByCreatedAtDesc();
    List<RiskAssessment> findTop10ByOrderByCreatedAtDesc();
    List<RiskAssessment> findByTargetTypeOrderByCreatedAtDesc(String targetType);
    List<RiskAssessment> findByTargetAddressIgnoreCaseOrderByCreatedAtDesc(String targetAddress);
    long countByRiskCategory(String riskCategory);
    long countByTargetType(String targetType);
}
