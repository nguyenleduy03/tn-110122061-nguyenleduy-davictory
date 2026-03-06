package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.AttemptAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttemptAnswerRepository extends JpaRepository<AttemptAnswer, Long> {

    List<AttemptAnswer> findByExamAttemptId(Long examAttemptId);

    Optional<AttemptAnswer> findByExamAttemptIdAndQuestionId(Long examAttemptId, Long questionId);

    // Tất cả câu đã trả lời (không bỏ trống)
    List<AttemptAnswer> findByExamAttemptIdAndIsAnsweredTrue(Long examAttemptId);

    // Tất cả câu bị đánh cờ xem lại
    List<AttemptAnswer> findByExamAttemptIdAndIsFlaggedTrue(Long examAttemptId);

    // Đếm số câu đúng trong một lần thi
    long countByExamAttemptIdAndIsCorrectTrue(Long examAttemptId);

    // Đếm số câu đã trả lời
    long countByExamAttemptIdAndIsAnsweredTrue(Long examAttemptId);

    // Tổng điểm của một lần thi
    @Query("SELECT COALESCE(SUM(a.pointsEarned), 0) FROM AttemptAnswer a WHERE a.examAttempt.id = :attemptId")
    Double sumPointsByAttemptId(@Param("attemptId") Long attemptId);
}
