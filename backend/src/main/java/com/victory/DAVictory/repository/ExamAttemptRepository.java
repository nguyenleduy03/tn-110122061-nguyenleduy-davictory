package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    // Lần làm bài của học viên theo đề thi + session
    List<ExamAttempt> findByUserIdAndTestIdAndSessionIdOrderByAttemptNumberDesc(Long userId, Long testId, Long sessionId);

    // Lần làm bài đang diễn ra
    Optional<ExamAttempt> findByUserIdAndSessionIdAndStatus(Long userId, Long sessionId, String status);

    // Số lần đã làm bài thi này
    long countByUserIdAndSessionId(Long userId, Long sessionId);

    long countByUserIdAndTestIdAndSessionId(Long userId, Long testId, Long sessionId);

    // Điểm cao nhất của học viên cho kỳ thi
    @Query("SELECT MAX(e.bandScore) FROM ExamAttempt e WHERE e.user.id = :userId AND e.session.id = :sessionId")
    Optional<Double> findMaxBandScoreByUserAndSession(@Param("userId") Long userId, @Param("sessionId") Long sessionId);

    // Lần làm bài theo trạng thái
    List<ExamAttempt> findByStatusOrderByCreatedAtDesc(String status);

    // Kiểm tra lần thứ mấy tiếp theo
    @Query("SELECT COALESCE(MAX(e.attemptNumber), 0) + 1 FROM ExamAttempt e WHERE e.user.id = :userId AND e.session.id = :sessionId")
    Integer getNextAttemptNumber(@Param("userId") Long userId, @Param("sessionId") Long sessionId);

    @Query("SELECT COALESCE(MAX(e.attemptNumber), 0) + 1 FROM ExamAttempt e WHERE e.user.id = :userId AND e.test.id = :testId AND e.session.id = :sessionId")
    Integer getNextAttemptNumberByTest(@Param("userId") Long userId, @Param("testId") Long testId, @Param("sessionId") Long sessionId);

    // Tất cả attempts của học viên trong lớp
    @Query("SELECT e FROM ExamAttempt e WHERE e.user.id IN " +
           "(SELECT cs.user.id FROM ClassStudent cs WHERE cs.clazz.id = :classId AND cs.status = 'ACTIVE') " +
           "ORDER BY e.createdAt DESC")
    List<ExamAttempt> findByClassId(@Param("classId") Long classId);

    // Attempts của một học viên cụ thể (để GV xem)
    @Query("SELECT e FROM ExamAttempt e WHERE e.user.id = :studentId " +
           "AND EXISTS (SELECT 1 FROM ClassStudent cs WHERE cs.user.id = :studentId AND cs.clazz.id = :classId) " +
           "ORDER BY e.createdAt DESC")
    List<ExamAttempt> findByStudentIdAndClassId(@Param("studentId") Long studentId, @Param("classId") Long classId);

    // Tất cả attempts của danh sách học viên
    @Query("SELECT e FROM ExamAttempt e WHERE e.user.id IN :userIds ORDER BY e.startedAt DESC")
    List<ExamAttempt> findByUserIdInOrderByStartedAtDesc(@Param("userIds") List<Long> userIds);

       @Modifying
       @Query("UPDATE ExamAttempt e SET e.test = null WHERE e.test.id = :testId")
       int clearTestReferenceByTestId(@Param("testId") Long testId);

       void deleteByTestId(Long testId);
}

