package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Value
@Builder
public class SpeakingResult {
    String id;
    String sessionId;
    Long userId;
    double overallBand;
    CriteriaScore fluencyCoherence;
    CriteriaScore lexicalResource;
    CriteriaScore grammaticalRangeAccuracy;
    CriteriaScore pronunciation;
    String overallFeedback;
    List<String> improvementPriority;
    List<String> strengths;
    List<String> weaknesses;
    String provider;
    String model;
    double confidenceScore;
    String promptVersion;
    int promptTokens;
    int completionTokens;
    long latencyMs;
    String status;
    String errorMessage;
    LocalDateTime createdAt;

    public Map<String, CriteriaScore> getAllCriteria() {
        return Map.of(
            "fluency_coherence", fluencyCoherence,
            "lexical_resource", lexicalResource,
            "grammatical_range_accuracy", grammaticalRangeAccuracy,
            "pronunciation", pronunciation
        );
    }

    public boolean isComplete() {
        return "COMPLETED".equals(status);
    }

    public boolean isFailed() {
        return "FAILED".equals(status);
    }
}
