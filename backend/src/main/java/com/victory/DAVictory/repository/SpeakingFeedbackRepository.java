package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.SpeakingFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpeakingFeedbackRepository extends JpaRepository<SpeakingFeedback, Long> {

    Optional<SpeakingFeedback> findBySpeakingAttemptId(Long attemptId);

    boolean existsBySpeakingAttemptId(Long attemptId);

    // Feedback chưa đọc của học viên
    List<SpeakingFeedback> findBySpeakingAttemptUserIdAndIsReadFalse(Long userId);

    // Tất cả feedback giảng viên đã viết
    List<SpeakingFeedback> findByCreatedByIdOrderByCreatedAtDesc(Long createdById);
}
