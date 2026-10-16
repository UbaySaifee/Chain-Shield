package com.chainshield.repository;

import com.chainshield.entity.AssessmentIndicator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AssessmentIndicatorRepository extends JpaRepository<AssessmentIndicator, Long> {
    List<AssessmentIndicator> findByAssessmentId(UUID assessmentId);
    List<AssessmentIndicator> findByAssessmentIdIn(java.util.Collection<UUID> assessmentIds);
}
