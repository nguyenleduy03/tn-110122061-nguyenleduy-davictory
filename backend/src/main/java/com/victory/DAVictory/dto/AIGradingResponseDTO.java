package com.victory.DAVictory.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class AIGradingResponseDTO {
    private String gradingId;
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
    private String confidenceReason;
    private String bandJustification;
    private String bandBoundarySummary;
    private Map<String, Object> analysis;
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
