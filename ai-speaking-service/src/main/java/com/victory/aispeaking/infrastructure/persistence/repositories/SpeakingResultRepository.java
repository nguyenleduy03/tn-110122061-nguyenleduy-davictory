package com.victory.aispeaking.infrastructure.persistence.repositories;

import com.victory.aispeaking.infrastructure.persistence.SpeakingResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SpeakingResultRepository extends JpaRepository<SpeakingResultEntity, Long> {
    Optional<SpeakingResultEntity> findByResultId(String resultId);
    Optional<SpeakingResultEntity> findBySessionId(String sessionId);
    long countByStatus(String status);
}
