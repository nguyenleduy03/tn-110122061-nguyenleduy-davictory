package com.victory.aispeaking.domain.service;

import com.victory.aispeaking.config.AIConfigProperties;
import com.victory.aispeaking.domain.model.SpeakingTurn;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class PronunciationEngine {

    private final AIConfigProperties config;

    public PronunciationEngine(AIConfigProperties config) {
        this.config = config;
    }

    public PronunciationMetrics analyze(List<SpeakingTurn> turns,
                                          Optional<List<Map<String, Object>>> wordLevelData) {
        double totalWords = 0;
        double lowConfidenceWords = 0;
        long totalAudioMs = 0;
        int hesitationCount = 0;

        for (SpeakingTurn turn : turns) {
            String answer = turn.getAnswerText();
            if (answer == null || answer.isBlank()) continue;

            String[] words = answer.split("\\s+");
            totalWords += words.length;

            for (String w : words) {
                String clean = w.toLowerCase().replaceAll("[^a-z]", "");
                if (isHesitation(clean)) {
                    hesitationCount++;
                }
            }

            totalAudioMs += Math.max(turn.getAnswerDurationMs(), 1);
        }

        if (wordLevelData.isPresent() && !wordLevelData.get().isEmpty()) {
            for (Map<String, Object> wordData : wordLevelData.get()) {
                double confidence = ((Number) wordData.getOrDefault("confidence", 1.0)).doubleValue();
                if (confidence < config.getPronunciation().getMinWordConfidence()) {
                    lowConfidenceWords++;
                }
            }
        }

        double confidenceRatio = totalWords > 0 ? 1.0 - (lowConfidenceWords / totalWords) : 1.0;
        double speechRate = totalAudioMs > 0
                ? (totalWords / (totalAudioMs / 60000.0))
                : 0;
        double hesitationRatio = totalWords > 0 ? (double) hesitationCount / totalWords : 0;
        int pronunciationBand = calculatePronunciationBand(
                confidenceRatio, speechRate, hesitationRatio);

        return new PronunciationMetrics(
                pronunciationBand,
                Math.round(confidenceRatio * 100.0) / 100.0,
                Math.round(speechRate * 10.0) / 10.0,
                hesitationCount,
                lowConfidenceWords > 0
                        ? List.of("Low confidence words detected - possible pronunciation issues")
                        : List.of()
        );
    }

    public PronunciationMetrics analyzeWithoutAudio(List<SpeakingTurn> turns) {
        double totalWords = 0;
        int hesitationCount = 0;

        for (SpeakingTurn turn : turns) {
            String answer = turn.getAnswerText();
            if (answer == null || answer.isBlank()) continue;

            String[] words = answer.split("\\s+");
            totalWords += words.length;

            for (String w : words) {
                if (isHesitation(w.toLowerCase().replaceAll("[^a-z]", ""))) {
                    hesitationCount++;
                }
            }
        }

        double hesitationRatio = totalWords > 0 ? (double) hesitationCount / totalWords : 0;
        int band = calculatePronunciationBandNoAudio(hesitationRatio);

        return new PronunciationMetrics(
                band, 0, 0, hesitationCount, List.of()
        );
    }

    private int calculatePronunciationBand(double confidenceRatio, double speechRate,
                                            double hesitationRatio) {
        if (confidenceRatio > 0.95 && speechRate >= 100 && speechRate <= 160 && hesitationRatio < 0.02)
            return 9;
        if (confidenceRatio > 0.90 && speechRate >= 90 && speechRate <= 170 && hesitationRatio < 0.04)
            return 8;
        if (confidenceRatio > 0.85 && speechRate >= 80 && speechRate <= 180 && hesitationRatio < 0.06)
            return 7;
        if (confidenceRatio > 0.80 && speechRate >= 70 && speechRate <= 190 && hesitationRatio < 0.09)
            return 6;
        if (confidenceRatio > 0.70 && speechRate >= 60 && speechRate <= 200 && hesitationRatio < 0.12)
            return 5;
        if (confidenceRatio > 0.60 && speechRate >= 50)
            return 4;
        return 3;
    }

    private int calculatePronunciationBandNoAudio(double hesitationRatio) {
        if (hesitationRatio < 0.02) return 7;
        if (hesitationRatio < 0.04) return 6;
        if (hesitationRatio < 0.07) return 5;
        if (hesitationRatio < 0.10) return 4;
        return 3;
    }

    private boolean isHesitation(String word) {
        return List.of("um", "uh", "er", "ah", "like", "hmm")
                .contains(word);
    }

    public record PronunciationMetrics(
            int band,
            double confidenceRatio,
            double speechRate,
            int hesitationCount,
            List<String> notableIssues
    ) {}
}
