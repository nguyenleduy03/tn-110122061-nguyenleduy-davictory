package com.victory.DAVictory.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TestResultResponse {
    private Long attemptId;
    private String testTitle;
    private String attemptType;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Integer totalTimeSeconds;
    
    // Overall scores
    private Double overallBand;
    private Integer totalQuestions;
    private Integer correctAnswers;
    private Double accuracyPercent;
    
    // Skill breakdown
    private List<SkillResult> skillResults;
    
    // Question details
    private List<QuestionResult> questionResults;
    
    @Data
    public static class SkillResult {
        private String skillType;
        private Double bandScore;
        private Integer totalQuestions;
        private Integer correctAnswers;
        private Double accuracyPercent;
        private String feedback;
    }
    
    @Data
    public static class QuestionResult {
        private Long questionId;
        private Integer questionNumber;
        private String questionType;
        private String userAnswer;
        private String correctAnswer;
        private Boolean isCorrect;
        private Double points;
        private String explanation;
    }
}
