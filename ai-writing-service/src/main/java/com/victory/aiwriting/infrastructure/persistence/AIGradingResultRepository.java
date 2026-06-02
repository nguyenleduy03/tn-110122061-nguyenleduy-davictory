package com.victory.aiwriting.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AIGradingResultRepository extends JpaRepository<AIGradingResultEntity, Long> {
    Optional<AIGradingResultEntity> findTopBySubmissionIdOrderByCreatedAtDesc(Long submissionId);
}
