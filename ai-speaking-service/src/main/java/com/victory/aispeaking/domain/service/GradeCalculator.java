package com.victory.aispeaking.domain.service;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class GradeCalculator {

    public double roundIELTSBand(double score) {
        if (score < 0) return 0;
        if (score > 9) return 9;
        double floor = Math.floor(score);
        double decimal = score - floor;
        if (decimal < 0.25) return floor;
        if (decimal < 0.75) return floor + 0.5;
        return Math.ceil(score);
    }

    public double calculateOverallBand(double fc, double lr, double gra, double p) {
        double avg = (fc + lr + gra + p) / 4.0;
        return roundIELTSBand(avg);
    }

    public double calculateOverallBand(List<Integer> bands) {
        if (bands.isEmpty()) return 0;
        double avg = bands.stream().mapToInt(Integer::intValue).average().orElse(0);
        return roundIELTSBand(avg);
    }

    public boolean isValidBand(int band) {
        return band >= 0 && band <= 9;
    }

    public int validateAndClamp(int band) {
        if (band < 0) return 0;
        if (band > 9) return 9;
        return band;
    }
}
