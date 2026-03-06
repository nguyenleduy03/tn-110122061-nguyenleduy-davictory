package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.SpeakingScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SpeakingScoreRepository extends JpaRepository<SpeakingScore, Long> {

    Optional<SpeakingScore> findBySpeakingAttemptId(Long attemptId);

    boolean existsBySpeakingAttemptId(Long attemptId);

    @Query("SELECT AVG(s.overallBandScore) FROM SpeakingScore s " +
           "WHERE s.speakingAttempt.user.id = :userId AND s.overallBandScore IS NOT NULL")
    Optional<Double> findAvgBandScoreByUser(@Param("userId") Long userId);

    @Query("SELECT AVG(s.fluencyCoherence), AVG(s.lexicalResource), " +
           "AVG(s.grammaticalRangeAccuracy), AVG(s.pronunciation) " +
           "FROM SpeakingScore s WHERE s.speakingAttempt.user.id = :userId")
    Object[] findAvgCriteriaScoresByUser(@Param("userId") Long userId);
}
