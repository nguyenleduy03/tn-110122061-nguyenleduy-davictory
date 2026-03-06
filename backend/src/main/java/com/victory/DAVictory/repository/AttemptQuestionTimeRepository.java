package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.AttemptQuestionTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttemptQuestionTimeRepository extends JpaRepository<AttemptQuestionTime, Long> {

    List<AttemptQuestionTime> findByExamAttemptId(Long examAttemptId);

    Optional<AttemptQuestionTime> findByExamAttemptIdAndQuestionId(Long examAttemptId, Long questionId);

    // Tổng thời gian làm bài của một attempt
    @Query("SELECT COALESCE(SUM(t.timeSpentSeconds), 0) FROM AttemptQuestionTime t WHERE t.examAttempt.id = :attemptId")
    Integer sumTimeByAttemptId(@Param("attemptId") Long attemptId);

    // Câu mất nhiều thời gian nhất (top N)
    @Query("SELECT t FROM AttemptQuestionTime t WHERE t.examAttempt.id = :attemptId ORDER BY t.timeSpentSeconds DESC")
    List<AttemptQuestionTime> findSlowestQuestions(@Param("attemptId") Long attemptId);
}
