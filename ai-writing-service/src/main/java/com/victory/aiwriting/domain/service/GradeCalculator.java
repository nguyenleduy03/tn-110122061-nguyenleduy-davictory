package com.victory.aiwriting.domain.service;

public class GradeCalculator {

    public static double roundIELTSBand(double score) {
        if (score < 0) return 0.0;
        if (score > 9.0) return 9.0;

        double decimal = score - Math.floor(score);

        if (decimal < 0.25) {
            return Math.floor(score);
        } else if (decimal < 0.75) {
            return Math.floor(score) + 0.5;
        } else {
            return Math.ceil(score);
        }
    }

    public static double calculateOverallBand(double ta, double cc, double lr, double gra) {
        double average = (ta + cc + lr + gra) / 4.0;
        return roundIELTSBand(average);
    }

    public static boolean isValidBand(double score) {
        if (score < 0 || score > 9.0) return false;
        double remainder = score % 0.5;
        return Math.abs(remainder) < 1e-9 || Math.abs(remainder - 0.5) < 1e-9;
    }

    public static double validateAndClamp(double score) {
        if (score < 0) return 0.0;
        if (score > 9.0) return 9.0;
        return score;
    }
}
