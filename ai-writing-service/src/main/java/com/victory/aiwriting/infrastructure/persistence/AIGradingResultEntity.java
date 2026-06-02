package com.victory.aiwriting.infrastructure.persistence;

import com.victory.aiwriting.domain.model.AIGradingResult;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "ai_grading_results")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AIGradingResultEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(length = 30)
    private String provider;

    @Column(length = 50)
    private String model;

    @Column(name = "overall_band", nullable = false)
    private Double overallBand;

    @Column(name = "ta_score")
    private Double taScore;

    @Column(name = "ta_feedback", columnDefinition = "TEXT")
    private String taFeedback;

    @Column(name = "cc_score")
    private Double ccScore;

    @Column(name = "cc_feedback", columnDefinition = "TEXT")
    private String ccFeedback;

    @Column(name = "lr_score")
    private Double lrScore;

    @Column(name = "lr_feedback", columnDefinition = "TEXT")
    private String lrFeedback;

    @Column(name = "gra_score")
    private Double graScore;

    @Column(name = "gra_feedback", columnDefinition = "TEXT")
    private String graFeedback;

    @Column(name = "overall_feedback", columnDefinition = "TEXT")
    private String overallFeedback;

    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(columnDefinition = "TEXT")
    private String weaknesses;

    @Column(name = "improvement_priority", columnDefinition = "TEXT")
    private String improvementPriority;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "reference_sample_ids", length = 500)
    private String referenceSampleIds;

    @Column(name = "prompt_version", length = 20)
    private String promptVersion;

    @Column(name = "prompt_tokens")
    private Integer promptTokens;

    @Column(name = "completion_tokens")
    private Integer completionTokens;

    @Column(name = "total_tokens")
    private Integer totalTokens;

    @Column(name = "latency_ms")
    private Long latencyMs;

    @Column(length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "teacher_adjustments", columnDefinition = "TEXT")
    private String teacherAdjustments;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public static AIGradingResultEntity from(AIGradingResult r) {
        var entity = AIGradingResultEntity.builder()
            .submissionId(r.getSubmissionId())
            .provider(r.getProvider())
            .model(r.getModel())
            .overallBand(r.getOverallBand())
            .overallFeedback(r.getOverallFeedback())
            .confidenceScore(r.getConfidenceScore())
            .referenceSampleIds(r.getReferenceSampleIds() != null
                ? String.join(",", r.getReferenceSampleIds().stream().map(String::valueOf).toList())
                : null)
            .promptVersion(r.getPromptVersion())
            .latencyMs(r.getLatencyMs())
            .status(r.getStatus() != null ? r.getStatus() : "COMPLETED")
            .build();

        if (r.getTaskResponse() != null) {
            entity.setTaScore(r.getTaskResponse().getBand());
            entity.setTaFeedback(r.getTaskResponse().getDetailedFeedback());
        }
        if (r.getCoherenceCohesion() != null) {
            entity.setCcScore(r.getCoherenceCohesion().getBand());
            entity.setCcFeedback(r.getCoherenceCohesion().getDetailedFeedback());
        }
        if (r.getLexicalResource() != null) {
            entity.setLrScore(r.getLexicalResource().getBand());
            entity.setLrFeedback(r.getLexicalResource().getDetailedFeedback());
        }
        if (r.getGrammaticalRange() != null) {
            entity.setGraScore(r.getGrammaticalRange().getBand());
            entity.setGraFeedback(r.getGrammaticalRange().getDetailedFeedback());
        }

        if (r.getStrengths() != null) {
            entity.setStrengths(String.join("||", r.getStrengths()));
        }
        if (r.getWeaknesses() != null) {
            entity.setWeaknesses(String.join("||", r.getWeaknesses()));
        }
        if (r.getImprovementPriority() != null) {
            entity.setImprovementPriority(String.join("||", r.getImprovementPriority()));
        }

        return entity;
    }

    public AIGradingResult toDomain() {
        var builder = AIGradingResult.builder()
            .id(id)
            .submissionId(submissionId)
            .provider(provider)
            .model(model)
            .overallBand(overallBand)
            .overallFeedback(overallFeedback)
            .strengths(strengths != null ? List.of(strengths.split("\\|\\|")) : null)
            .weaknesses(weaknesses != null ? List.of(weaknesses.split("\\|\\|")) : null)
            .improvementPriority(improvementPriority != null ? List.of(improvementPriority.split("\\|\\|")) : null)
            .confidenceScore(confidenceScore)
            .referenceSampleIds(referenceSampleIds != null
                ? List.of(referenceSampleIds.split(",")).stream().map(Long::parseLong).toList()
                : null)
            .promptVersion(promptVersion)
            .latencyMs(latencyMs != null ? latencyMs : 0L)
            .status(status);

        if (taScore != null) {
            com.victory.aiwriting.domain.model.CriteriaScore cs =
                com.victory.aiwriting.domain.model.CriteriaScore.builder()
                    .code("TA").band(taScore).detailedFeedback(taFeedback).build();
            builder.taskResponse(cs);
        }
        if (ccScore != null) {
            builder.coherenceCohesion(
                com.victory.aiwriting.domain.model.CriteriaScore.builder()
                    .code("CC").band(ccScore).detailedFeedback(ccFeedback).build());
        }
        if (lrScore != null) {
            builder.lexicalResource(
                com.victory.aiwriting.domain.model.CriteriaScore.builder()
                    .code("LR").band(lrScore).detailedFeedback(lrFeedback).build());
        }
        if (graScore != null) {
            builder.grammaticalRange(
                com.victory.aiwriting.domain.model.CriteriaScore.builder()
                    .code("GRA").band(graScore).detailedFeedback(graFeedback).build());
        }

        return builder.build();
    }
}
