package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    // Tất cả lần làm bài của học viên
    List<ExamAttempt> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Lần làm bài của học viên theo kỳ thi cụ thể
    List<ExamAttempt> findByUserIdAndSessionIdOrderByAttemptNumberDesc(Long userId, Long sessionId);

    // Lần làm bài đang diễn ra
    Optional<ExamAttempt> findByUserIdAndSessionIdAndStatus(Long userId, Long sessionId, String status);

    // Số lần đã làm bài thi này
    long countByUserIdAndSessionId(Long userId, Long sessionId);

    // Điểm cao nhất của học viên cho kỳ thi
    @Query("SELECT MAX(e.bandScore) FROM ExamAttempt e WHERE e.user.id = :userId AND e.session.id = :sessionId")
    Optional<Double> findMaxBandScoreByUserAndSession(@Param("userId") Long userId, @Param("sessionId") Long sessionId);

    // Lần làm bài theo trạng thái
    List<ExamAttempt> findByStatusOrderByCreatedAtDesc(String status);

    // Kiểm tra lần thứ mấy tiếp theo
    @Query("SELECT COALESCE(MAX(e.attemptNumber), 0) + 1 FROM ExamAttempt e WHERE e.user.id = :userId AND e.session.id = :sessionId")
    Integer getNextAttemptNumber(@Param("userId") Long userId, @Param("sessionId") Long sessionId);
}
