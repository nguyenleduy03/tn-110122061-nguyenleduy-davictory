package com.victory.DAVictory.dto;

import lombok.Data;
import java.util.List;

@Data
public class AIGradingResponseDTO {
    private Long gradingId;
    private Long submissionId;
    private String provider;
    private String model;
    private Double overallBand;
    private CriteriaScoreDTO taskResponse;
    private CriteriaScoreDTO coherenceCohesion;
    private CriteriaScoreDTO lexicalResource;
    private CriteriaScoreDTO grammaticalRange;
    private String overallFeedback;
    private List<String> strengths;
    private List<String> weaknesses;
    private List<String> improvementPriority;
    private Double confidenceScore;
    private List<Long> referenceSampleIds;
    private String status;
    private String promptVersion;
    private long latencyMs;
    private String fullPrompt;

    @Data
    public static class CriteriaScoreDTO {
        private Double band;
        private String bandJustification;
        private List<String> strengths;
        private List<String> weaknesses;
        private List<String> evidenceFromEssay;
        private String detailedFeedback;
    }
}
