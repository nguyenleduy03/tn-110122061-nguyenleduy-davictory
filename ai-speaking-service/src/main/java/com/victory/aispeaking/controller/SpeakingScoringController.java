package com.victory.aispeaking.controller;

import com.victory.aispeaking.application.SpeakingOrchestrator;
import com.victory.aispeaking.application.dto.SpeakingResultDTO;
import com.victory.aispeaking.domain.model.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/speaking/scoring")
@RequiredArgsConstructor
public class SpeakingScoringController {

    private final SpeakingOrchestrator orchestrator;

    @PostMapping("/evaluate/{sessionId}")
    public ResponseEntity<?> evaluateSession(
            @PathVariable String sessionId,
            @RequestHeader("X-User-Id") Long userId) {

        try {
            SpeakingResult result = orchestrator.evaluateSession(sessionId, userId);
            return ResponseEntity.ok(toResultDTO(result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/result/{sessionId}")
    public ResponseEntity<?> getResult(@PathVariable String sessionId) {
        try {
            SpeakingResult result = orchestrator.evaluateSession(sessionId, null);
            return ResponseEntity.ok(toResultDTO(result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private SpeakingResultDTO toResultDTO(SpeakingResult result) {
        return SpeakingResultDTO.builder()
                .resultId(result.getId())
                .sessionId(result.getSessionId())
                .overallBand(result.getOverallBand())
                .fluencyCoherence(toCriteriaDTO(result.getFluencyCoherence()))
                .lexicalResource(toCriteriaDTO(result.getLexicalResource()))
                .grammaticalRangeAccuracy(toCriteriaDTO(result.getGrammaticalRangeAccuracy()))
                .pronunciation(toCriteriaDTO(result.getPronunciation()))
                .overallFeedback(result.getOverallFeedback())
                .improvementPriority(result.getImprovementPriority())
                .strengths(result.getStrengths())
                .weaknesses(result.getWeaknesses())
                .provider(result.getProvider())
                .model(result.getModel())
                .confidenceScore(result.getConfidenceScore())
                .status(result.getStatus())
                .errorMessage(result.getErrorMessage())
                .build();
    }

    private SpeakingResultDTO.CriteriaScoreDTO toCriteriaDTO(CriteriaScore score) {
        if (score == null) {
            return SpeakingResultDTO.CriteriaScoreDTO.builder()
                    .code("N/A").displayName("Not evaluated")
                    .band(0).strengths(java.util.List.of())
                    .weaknesses(java.util.List.of()).detailedFeedback("")
                    .build();
        }
        return SpeakingResultDTO.CriteriaScoreDTO.builder()
                .code(score.getCode())
                .displayName(score.getDisplayName())
                .band(score.getBand())
                .strengths(score.getStrengths())
                .weaknesses(score.getWeaknesses())
                .detailedFeedback(score.getDetailedFeedback())
                .build();
    }
}
