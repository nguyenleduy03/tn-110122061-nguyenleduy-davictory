package com.victory.aispeaking.infrastructure.persistence.repositories;

import com.victory.aispeaking.infrastructure.persistence.SpeakingTurnEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpeakingTurnRepository extends JpaRepository<SpeakingTurnEntity, Long> {
    List<SpeakingTurnEntity> findBySessionIdOrderByTurnNumberAsc(String sessionId);
    long countBySessionId(String sessionId);
    void deleteBySessionId(String sessionId);
}
