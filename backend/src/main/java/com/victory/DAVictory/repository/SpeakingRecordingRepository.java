package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.SpeakingRecording;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpeakingRecordingRepository extends JpaRepository<SpeakingRecording, Long> {

    List<SpeakingRecording> findBySpeakingAttemptIdOrderByRecordingOrderAsc(Long attemptId);

    List<SpeakingRecording> findBySpeakingAttemptIdAndRecordingPart(Long attemptId, String part);

    // File chờ chuyển văn bản
    List<SpeakingRecording> findByTranscriptStatusOrderByCreatedAtAsc(String transcriptStatus);
}
