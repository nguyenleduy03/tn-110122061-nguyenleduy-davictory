package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Part;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartRepository extends JpaRepository<Part, Long> {

    List<Part> findBySessionId(Long sessionId);

    List<Part> findBySessionIdOrderByOrderIndexAsc(Long sessionId);

    List<Part> findByDifficultyLevelId(Long difficultyLevelId);

    List<Part> findByIsActive(Boolean isActive);

    List<Part> findByQuestionFormat(String questionFormat);

    boolean existsBySessionIdAndOrderIndex(Long sessionId, Integer orderIndex);
}
