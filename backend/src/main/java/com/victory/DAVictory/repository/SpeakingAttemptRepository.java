package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.SpeakingAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpeakingAttemptRepository extends JpaRepository<SpeakingAttempt, Long> {

    List<SpeakingAttempt> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<SpeakingAttempt> findByUserIdAndSpeakingPartOrderByAttemptNumberDesc(Long userId, String part);

    List<SpeakingAttempt> findByUserIdAndCueCardIdOrderByAttemptNumberDesc(Long userId, Long cueCardId);

    List<SpeakingAttempt> findByStatusOrderByCreatedAtDesc(String status);

    List<SpeakingAttempt> findByGradedByIdAndStatus(Long gradedById, String status);

    long countByUserIdAndCueCardId(Long userId, Long cueCardId);

    @Query("SELECT COALESCE(MAX(a.attemptNumber), 0) + 1 FROM SpeakingAttempt a " +
           "WHERE a.user.id = :userId AND a.cueCard.id = :cueCardId")
    Integer getNextAttemptNumber(@Param("userId") Long userId, @Param("cueCardId") Long cueCardId);

    @Query("SELECT MAX(a.overallBandScore) FROM SpeakingAttempt a " +
           "WHERE a.user.id = :userId AND a.overallBandScore IS NOT NULL")
    Optional<Double> findMaxBandScoreByUser(@Param("userId") Long userId);
}
