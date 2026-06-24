package com.victory.DAVictory.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class SpeakingAttemptResponse {

    private Long id;
    private Long userId;
    private String username;
    private String speakingPart;
    private String status;
    private Double overallBandScore;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime gradedAt;
    private String overallFeedback;
    private ScoreDTO score;
    private List<RecordingDTO> recordings;

    @Data
    public static class ScoreDTO {
        private Double fluencyCoherence;
        private Double lexicalResource;
        private Double grammaticalRangeAccuracy;
        private Double pronunciation;
        private Double overallBandScore;
    }

    @Data
    public static class RecordingDTO {
        private Long id;
        private String audioUrl;
        private String transcript;
        private String transcriptStatus;
        private String recordingPart;
        private Integer durationSeconds;
    }
}