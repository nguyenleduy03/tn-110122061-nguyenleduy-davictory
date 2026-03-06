package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

    List<Assignment> findByClazzIdAndIsActiveTrueOrderByDueDateAsc(Long classId);

    List<Assignment> findByClazzIdAndStatusAndIsActiveTrue(Long classId, String status);

    List<Assignment> findByCreatedByIdAndIsActiveTrueOrderByCreatedAtDesc(Long createdById);

    // Bài tập sắp đến hạn
    @Query("SELECT a FROM Assignment a WHERE a.clazz.id = :classId " +
           "AND a.dueDate BETWEEN :now AND :deadline AND a.isActive = true")
    List<Assignment> findUpcomingDeadlines(@Param("classId") Long classId,
                                           @Param("now") LocalDateTime now,
                                           @Param("deadline") LocalDateTime deadline);

    // Đếm số bài đã nộp / chưa nộp
    @Query("SELECT COUNT(s) FROM AssignmentSubmission s WHERE s.assignment.id = :assignmentId AND s.status != 'NOT_SUBMITTED'")
    long countSubmissions(@Param("assignmentId") Long assignmentId);
}
