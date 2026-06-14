package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.SpeakingGeneratedQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpeakingGeneratedQuestionRepository extends JpaRepository<SpeakingGeneratedQuestion, Long> {
    List<SpeakingGeneratedQuestion> findBySpeakingAttemptIdOrderByQuestionIndexAsc(Long attemptId);
    List<SpeakingGeneratedQuestion> findBySpeakingAttemptIdAndPartOrderByQuestionIndexAsc(Long attemptId, String part);
    void deleteBySpeakingAttemptId(Long attemptId);
}
