package com.victory.aispeaking.infrastructure.persistence.repositories;

import com.victory.aispeaking.infrastructure.persistence.SpeakingSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpeakingSessionRepository extends JpaRepository<SpeakingSessionEntity, Long> {
    Optional<SpeakingSessionEntity> findBySessionId(String sessionId);
    List<SpeakingSessionEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<SpeakingSessionEntity> findByStatusOrderByCreatedAtDesc(String status);
    long countByUserIdAndStatus(Long userId, String status);
}
