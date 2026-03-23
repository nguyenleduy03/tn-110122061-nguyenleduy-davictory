package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.ExamAttemptGradeHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExamAttemptGradeHistoryRepository extends JpaRepository<ExamAttemptGradeHistory, Long> {
    List<ExamAttemptGradeHistory> findByExamAttemptIdOrderByEditedAtDesc(Long examAttemptId);
}
