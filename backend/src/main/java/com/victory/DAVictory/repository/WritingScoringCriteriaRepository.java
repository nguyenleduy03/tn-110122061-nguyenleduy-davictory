package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.WritingScoringCriteria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WritingScoringCriteriaRepository extends JpaRepository<WritingScoringCriteria, Long> {

    List<WritingScoringCriteria> findByWritingTaskIdAndIsActiveTrueOrderByOrderIndexAsc(Long writingTaskId);

    Optional<WritingScoringCriteria> findByWritingTaskIdAndCode(Long writingTaskId, String code);

    boolean existsByWritingTaskIdAndCode(Long writingTaskId, String code);
}
