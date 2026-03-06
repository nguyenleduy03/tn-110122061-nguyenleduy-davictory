package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.WritingSampleAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WritingSampleAnswerRepository extends JpaRepository<WritingSampleAnswer, Long> {

    List<WritingSampleAnswer> findByWritingPromptIdAndIsActiveTrueOrderByBandScoreDesc(Long promptId);

    List<WritingSampleAnswer> findByWritingPromptIdAndBandScoreGreaterThanEqualOrderByBandScoreDesc(
            Long promptId, Double minBand);
}
