package com.victory.aiwriting.application.dto;

import com.victory.aiwriting.domain.model.AIGradingResult;
import com.victory.aiwriting.domain.model.CriteriaScore;
import com.victory.aiwriting.domain.model.SampleEssay;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
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

    public static AIGradingResponseDTO from(AIGradingResult r, List<SampleEssay> samples) {
        return AIGradingResponseDTO.builder()
            .gradingId(r.getId())
            .submissionId(r.getSubmissionId())
            .provider(r.getProvider())
            .model(r.getModel())
            .overallBand(r.getOverallBand())
            .taskResponse(toDTO(r.getTaskResponse()))
            .coherenceCohesion(toDTO(r.getCoherenceCohesion()))
            .lexicalResource(toDTO(r.getLexicalResource()))
            .grammaticalRange(toDTO(r.getGrammaticalRange()))
            .overallFeedback(r.getOverallFeedback())
            .strengths(r.getStrengths())
            .weaknesses(r.getWeaknesses())
            .improvementPriority(r.getImprovementPriority())
            .confidenceScore(r.getConfidenceScore())
            .referenceSampleIds(r.getReferenceSampleIds())
            .status(r.getStatus())
            .promptVersion(r.getPromptVersion())
            .latencyMs(r.getLatencyMs())
            .build();
    }

    private static CriteriaScoreDTO toDTO(CriteriaScore cs) {
        if (cs == null) return null;
        return CriteriaScoreDTO.builder()
            .band(cs.getBand())
            .bandJustification(cs.getBandJustification())
            .strengths(cs.getStrengths())
            .weaknesses(cs.getWeaknesses())
            .evidenceFromEssay(cs.getEvidenceFromEssay())
            .detailedFeedback(cs.getDetailedFeedback())
            .build();
    }

    @Data
    @Builder
    public static class CriteriaScoreDTO {
        private Double band;
        private String bandJustification;
        private List<String> strengths;
        private List<String> weaknesses;
        private List<String> evidenceFromEssay;
        private String detailedFeedback;
    }
}
