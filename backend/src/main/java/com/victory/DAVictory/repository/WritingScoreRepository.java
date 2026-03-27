package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.WritingScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WritingScoreRepository extends JpaRepository<WritingScore, Long> {

    List<WritingScore> findBySubmissionId(Long submissionId);

    Optional<WritingScore> findBySubmissionIdAndCriteriaId(Long submissionId, Long criteriaId);

    boolean existsBySubmissionIdAndCriteriaId(Long submissionId, Long criteriaId);
    
    void deleteBySubmissionId(Long submissionId);

    // Trung bình điểm từng tiêu chí của một học viên
    @Query("SELECT ws.criteria.code, AVG(ws.score) FROM WritingScore ws " +
           "WHERE ws.submission.user.id = :userId GROUP BY ws.criteria.code")
    List<Object[]> findAvgScoreByCriteriaForUser(@Param("userId") Long userId);
}
