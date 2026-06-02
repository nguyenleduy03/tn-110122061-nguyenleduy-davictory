package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class AIGradingResult {
    private Long id;
    private Long submissionId;
    private String provider;
    private String model;

    private Double overallBand;

    private CriteriaScore taskResponse;
    private CriteriaScore coherenceCohesion;
    private CriteriaScore lexicalResource;
    private CriteriaScore grammaticalRange;

    private String overallFeedback;
    private List<String> strengths;
    private List<String> weaknesses;
    private List<String> improvementPriority;

    private Double confidenceScore;
    private List<Long> referenceSampleIds;
    private String promptVersion;

    private int promptTokens;
    private int completionTokens;
    private long latencyMs;

    private String status;
    private String errorMessage;
    private Long approvedBy;
    private String teacherAdjustments;
}
