package com.victory.DAVictory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingResultDTO {
    private String resultId;
    private String sessionId;
    private double overallBand;
    private CriteriaScoreDTO fluencyCoherence;
    private CriteriaScoreDTO lexicalResource;
    private CriteriaScoreDTO grammaticalRangeAccuracy;
    private CriteriaScoreDTO pronunciation;
    private String overallFeedback;
    private List<String> improvementPriority;
    private List<String> strengths;
    private List<String> weaknesses;
    private String provider;
    private String model;
    private double confidenceScore;
    private String status;
    private String errorMessage;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CriteriaScoreDTO {
        private String code;
        private String displayName;
        private int band;
        private List<String> strengths;
        private List<String> weaknesses;
        private String detailedFeedback;
    }
}
