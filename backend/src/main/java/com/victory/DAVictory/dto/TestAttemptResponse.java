package com.victory.DAVictory.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TestAttemptResponse {
    private Long attemptId;
    private Long testId;
    private String testTitle;
    private String attemptType; // FULL_TEST, SINGLE_SKILL, PRACTICE
    private List<SessionAttemptInfo> sessions;
    private LocalDateTime startedAt;
    private LocalDateTime expiresAt;
    private Integer timeLimitSeconds;
    private String status; // IN_PROGRESS, COMPLETED, EXPIRED
    
    @Data
    public static class SessionAttemptInfo {
        private Long sessionId;
        private String skillType;
        private String sessionName;
        private Integer durationMinutes;
        private Integer totalQuestions;
        private Integer answeredQuestions;
        private Boolean isCompleted;
    }
}
