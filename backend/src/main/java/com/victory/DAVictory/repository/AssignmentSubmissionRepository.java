package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {

    Optional<AssignmentSubmission> findByAssignmentIdAndUserId(Long assignmentId, Long userId);

    boolean existsByAssignmentIdAndUserId(Long assignmentId, Long userId);

    // Tất cả bài nộp của một assignment
    List<AssignmentSubmission> findByAssignmentIdOrderBySubmittedAtDesc(Long assignmentId);

    // Bài nộp chưa chấm
    List<AssignmentSubmission> findByAssignmentIdAndStatus(Long assignmentId, String status);

    // Tất cả bài nộp của học viên
    List<AssignmentSubmission> findByUserIdOrderBySubmittedAtDesc(Long userId);

    // Bài chờ chấm của giáo viên (theo lớp)
    @Query("SELECT s FROM AssignmentSubmission s WHERE s.assignment.clazz.id = :classId " +
           "AND s.status = 'SUBMITTED' ORDER BY s.submittedAt ASC")
    List<AssignmentSubmission> findPendingByClassId(@Param("classId") Long classId);

    @Query("SELECT AVG(s.score) FROM AssignmentSubmission s " +
           "WHERE s.assignment.id = :assignmentId AND s.score IS NOT NULL")
    Optional<Double> findAvgScoreByAssignment(@Param("assignmentId") Long assignmentId);

    // NEW METHODS
    List<AssignmentSubmission> findByAssignmentAndUserOrderByAttemptNumberDesc(
        com.victory.DAVictory.entity.Assignment assignment, 
        com.victory.DAVictory.entity.User user
    );

    int countByAssignmentAndUser(
        com.victory.DAVictory.entity.Assignment assignment, 
        com.victory.DAVictory.entity.User user
    );

    boolean existsByExamAttemptId(Long examAttemptId);
}
