package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.StudentWritingSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentWritingSubmissionRepository extends JpaRepository<StudentWritingSubmission, Long> {

    // Tất cả bài nộp của học viên
    List<StudentWritingSubmission> findByUserIdOrderBySubmittedAtDesc(Long userId);

    // Bài nộp theo học viên + đề bài
    List<StudentWritingSubmission> findByUserIdAndWritingPromptIdOrderByAttemptNumberDesc(
            Long userId, Long promptId);

    // Lần nộp mới nhất của học viên cho đề bài
    Optional<StudentWritingSubmission> findTopByUserIdAndWritingPromptIdOrderByAttemptNumberDesc(
            Long userId, Long promptId);

    // Bài chưa chấm (SUBMITTED, UNDER_REVIEW)
    List<StudentWritingSubmission> findByStatusOrderBySubmittedAtAsc(String status);

    // Bài cần chấm của một giảng viên cụ thể
    List<StudentWritingSubmission> findByGradedByIdAndStatus(Long gradedById, String status);

    // Số lần nộp của học viên cho đề bài
    long countByUserIdAndWritingPromptId(Long userId, Long promptId);

    // Điểm trung bình của học viên
    @Query("SELECT AVG(s.overallBandScore) FROM StudentWritingSubmission s " +
           "WHERE s.user.id = :userId AND s.overallBandScore IS NOT NULL")
    Optional<Double> findAvgBandScoreByUser(@Param("userId") Long userId);

    // Số lần nộp tiếp theo cho đề bài (writing_prompts)
    @Query("SELECT COALESCE(MAX(s.attemptNumber), 0) + 1 FROM StudentWritingSubmission s " +
           "WHERE s.user.id = :userId AND s.writingPrompt.id = :promptId")
    Integer getNextAttemptNumber(@Param("userId") Long userId, @Param("promptId") Long promptId);

    // ─── Queries theo question_group (TestBuilder flow) ───────────

    // Tất cả bài nộp của học viên cho một question group
    List<StudentWritingSubmission> findByUserIdAndQuestionGroupIdOrderByAttemptNumberDesc(
            Long userId, Long questionGroupId);

    // Lần nộp mới nhất của học viên cho question group
    Optional<StudentWritingSubmission> findTopByUserIdAndQuestionGroupIdOrderByAttemptNumberDesc(
            Long userId, Long questionGroupId);

    // Số lần nộp tiếp theo cho question group
    @Query("SELECT COALESCE(MAX(s.attemptNumber), 0) + 1 FROM StudentWritingSubmission s " +
           "WHERE s.user.id = :userId AND s.questionGroup.id = :groupId")
    Integer getNextAttemptNumberByGroup(@Param("userId") Long userId, @Param("groupId") Long groupId);

    // Tất cả bài chờ chấm (dùng cho giảng viên)
    List<StudentWritingSubmission> findByStatusInOrderBySubmittedAtAsc(List<String> statuses);

    // Tìm submissions của các học viên trong danh sách user IDs
    @Query("SELECT s FROM StudentWritingSubmission s WHERE s.user.id IN :userIds ORDER BY s.submittedAt DESC")
    List<StudentWritingSubmission> findByUserIdInOrderBySubmittedAtDesc(@Param("userIds") List<Long> userIds);
}
