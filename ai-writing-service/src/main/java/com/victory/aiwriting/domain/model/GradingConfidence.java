package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GradingConfidence {
    private double overall;

    private double ragSimilarity;
    private double criteriaConsistency;
    private double referenceQuality;
    private boolean hasFullRubric;

    public static GradingConfidence calculate(
            double avgRagSimilarity,
            double criteriaStdDev,
            double referenceQualityScore,
            double bandSpread) {

        double ragScore = normalize(avgRagSimilarity, 0.5, 0.9);
        double consistencyScore = 1.0 - normalize(criteriaStdDev, 0.0, 1.0);
        double refScore = normalize(referenceQualityScore, 0.0, 1.0);
        double spreadScore = normalize(bandSpread, 0.5, 4.0);

        double overall = ragScore * 0.35
                       + consistencyScore * 0.30
                       + refScore * 0.20
                       + spreadScore * 0.15;

        return GradingConfidence.builder()
            .overall(clamp(overall))
            .ragSimilarity(clamp(ragScore))
            .criteriaConsistency(clamp(consistencyScore))
            .referenceQuality(clamp(refScore))
            .build();
    }

    private static double normalize(double value, double min, double max) {
        if (max <= min) return 0.5;
        return (value - min) / (max - min);
    }

    private static double clamp(double v) {
        return Math.max(0.0, Math.min(1.0, v));
    }
}
