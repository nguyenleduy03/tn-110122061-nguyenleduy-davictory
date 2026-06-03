package com.victory.aispeaking.domain.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.victory.aispeaking.domain.model.CriteriaScore;
import com.victory.aispeaking.domain.model.SpeakingResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ResponseParser {

    private final ObjectMapper objectMapper;
    private final GradeCalculator gradeCalculator;

    public SpeakingResult parseFluencyScore(String rawResponse, String sessionId, Long userId,
                                             String provider, String model, long latencyMs) {
        try {
            JsonNode root = extractJson(rawResponse);
            int band = root.get("band").asInt();
            List<String> strengths = parseList(root, "strengths");
            List<String> weaknesses = parseList(root, "weaknesses");
            String feedback = root.path("detailedFeedback").asText("");

            CriteriaScore score = CriteriaScore.builder()
                    .code("FC")
                    .displayName("Fluency and Coherence")
                    .band(gradeCalculator.validateAndClamp(band))
                    .strengths(strengths)
                    .weaknesses(weaknesses)
                    .detailedFeedback(feedback)
                    .build();

            return SpeakingResult.builder()
                    .sessionId(sessionId)
                    .userId(userId)
                    .fluencyCoherence(score)
                    .provider(provider)
                    .model(model)
                    .latencyMs(latencyMs)
                    .status("FLUENCY_COMPLETED")
                    .createdAt(LocalDateTime.now())
                    .build();
        } catch (Exception e) {
            return SpeakingResult.builder()
                    .sessionId(sessionId)
                    .userId(userId)
                    .fluencyCoherence(CriteriaScore.empty("FC", "Fluency and Coherence"))
                    .status("FLUENCY_FAILED")
                    .errorMessage("Failed to parse fluency score: " + e.getMessage())
                    .createdAt(LocalDateTime.now())
                    .build();
        }
    }

    public SpeakingResult parseLexicalScore(String rawResponse, SpeakingResult partial) {
        try {
            JsonNode root = extractJson(rawResponse);
            int band = root.get("band").asInt();

            CriteriaScore score = CriteriaScore.builder()
                    .code("LR")
                    .displayName("Lexical Resource")
                    .band(gradeCalculator.validateAndClamp(band))
                    .strengths(parseList(root, "strengths"))
                    .weaknesses(parseList(root, "weaknesses"))
                    .detailedFeedback(root.path("detailedFeedback").asText(""))
                    .build();

            return SpeakingResult.builder()
                    .id(partial.getId())
                    .sessionId(partial.getSessionId())
                    .userId(partial.getUserId())
                    .fluencyCoherence(partial.getFluencyCoherence())
                    .lexicalResource(score)
                    .grammaticalRangeAccuracy(partial.getGrammaticalRangeAccuracy())
                    .pronunciation(partial.getPronunciation())
                    .provider(partial.getProvider())
                    .model(partial.getModel())
                    .latencyMs(partial.getLatencyMs())
                    .status("LEXICAL_COMPLETED")
                    .createdAt(partial.getCreatedAt())
                    .build();
        } catch (Exception e) {
            return SpeakingResult.builder()
                    .id(partial.getId())
                    .sessionId(partial.getSessionId())
                    .userId(partial.getUserId())
                    .fluencyCoherence(partial.getFluencyCoherence())
                    .lexicalResource(CriteriaScore.empty("LR", "Lexical Resource"))
                    .grammaticalRangeAccuracy(partial.getGrammaticalRangeAccuracy())
                    .pronunciation(partial.getPronunciation())
                    .status("LEXICAL_FAILED")
                    .errorMessage("Failed to parse lexical score: " + e.getMessage())
                    .createdAt(partial.getCreatedAt())
                    .build();
        }
    }

    public SpeakingResult parseGrammarScore(String rawResponse, SpeakingResult partial) {
        try {
            JsonNode root = extractJson(rawResponse);
            int band = root.get("band").asInt();

            CriteriaScore score = CriteriaScore.builder()
                    .code("GRA")
                    .displayName("Grammatical Range and Accuracy")
                    .band(gradeCalculator.validateAndClamp(band))
                    .strengths(parseList(root, "strengths"))
                    .weaknesses(parseList(root, "weaknesses"))
                    .detailedFeedback(root.path("detailedFeedback").asText(""))
                    .build();

            return SpeakingResult.builder()
                    .id(partial.getId())
                    .sessionId(partial.getSessionId())
                    .userId(partial.getUserId())
                    .fluencyCoherence(partial.getFluencyCoherence())
                    .lexicalResource(partial.getLexicalResource())
                    .grammaticalRangeAccuracy(score)
                    .pronunciation(partial.getPronunciation())
                    .provider(partial.getProvider())
                    .model(partial.getModel())
                    .latencyMs(partial.getLatencyMs())
                    .status("GRAMMAR_COMPLETED")
                    .createdAt(partial.getCreatedAt())
                    .build();
        } catch (Exception e) {
            return SpeakingResult.builder()
                    .id(partial.getId())
                    .sessionId(partial.getSessionId())
                    .userId(partial.getUserId())
                    .fluencyCoherence(partial.getFluencyCoherence())
                    .lexicalResource(partial.getLexicalResource())
                    .grammaticalRangeAccuracy(CriteriaScore.empty("GRA", "Grammatical Range and Accuracy"))
                    .pronunciation(partial.getPronunciation())
                    .status("GRAMMAR_FAILED")
                    .errorMessage("Failed to parse grammar score: " + e.getMessage())
                    .createdAt(partial.getCreatedAt())
                    .build();
        }
    }

    public SpeakingResult parsePronunciationScore(String rawResponse, SpeakingResult partial,
                                                   List<String> allStrengths, List<String> allWeaknesses,
                                                   String overallFeedback, List<String> improvementPriority) {
        try {
            JsonNode root = extractJson(rawResponse);
            int band = root.get("band").asInt();

            CriteriaScore score = CriteriaScore.builder()
                    .code("P")
                    .displayName("Pronunciation")
                    .band(gradeCalculator.validateAndClamp(band))
                    .strengths(parseList(root, "strengths"))
                    .weaknesses(parseList(root, "weaknesses"))
                    .detailedFeedback(root.path("detailedFeedback").asText(""))
                    .build();

            double overall = gradeCalculator.calculateOverallBand(
                    partial.getFluencyCoherence().getBand(),
                    partial.getLexicalResource().getBand(),
                    partial.getGrammaticalRangeAccuracy().getBand(),
                    score.getBand()
            );

            return SpeakingResult.builder()
                    .id(partial.getId())
                    .sessionId(partial.getSessionId())
                    .userId(partial.getUserId())
                    .overallBand(overall)
                    .fluencyCoherence(partial.getFluencyCoherence())
                    .lexicalResource(partial.getLexicalResource())
                    .grammaticalRangeAccuracy(partial.getGrammaticalRangeAccuracy())
                    .pronunciation(score)
                    .overallFeedback(overallFeedback)
                    .improvementPriority(improvementPriority)
                    .strengths(allStrengths)
                    .weaknesses(allWeaknesses)
                    .provider(partial.getProvider())
                    .model(partial.getModel())
                    .confidenceScore(calculateConfidence(partial, score))
                    .promptVersion(partial.getPromptVersion())
                    .latencyMs(partial.getLatencyMs())
                    .status("COMPLETED")
                    .createdAt(partial.getCreatedAt())
                    .build();
        } catch (Exception e) {
            return SpeakingResult.builder()
                    .id(partial.getId())
                    .sessionId(partial.getSessionId())
                    .userId(partial.getUserId())
                    .fluencyCoherence(partial.getFluencyCoherence())
                    .lexicalResource(partial.getLexicalResource())
                    .grammaticalRangeAccuracy(partial.getGrammaticalRangeAccuracy())
                    .pronunciation(CriteriaScore.empty("P", "Pronunciation"))
                    .status("COMPLETED_WITH_ERRORS")
                    .errorMessage("Pronunciation evaluation failed: " + e.getMessage())
                    .createdAt(partial.getCreatedAt())
                    .build();
        }
    }

    public String extractConversationResponse(String rawResponse) {
        try {
            JsonNode root = extractJson(rawResponse);
            if (root.has("response")) {
                return root.get("response").asText();
            }
            if (root.has("message")) {
                return root.get("message").asText();
            }
            if (root.has("text")) {
                return root.get("text").asText();
            }
            return rawResponse.replaceAll("```[a-z]*\\n?", "").trim();
        } catch (Exception e) {
            return rawResponse.replaceAll("```[a-z]*\\n?", "").trim();
        }
    }

    private JsonNode extractJson(String raw) {
        try {
            String cleaned = raw.replaceAll("```json\\n?", "").replaceAll("```\\n?", "").trim();
            int start = cleaned.indexOf('{');
            int end = cleaned.lastIndexOf('}');
            if (start >= 0 && end > start) {
                cleaned = cleaned.substring(start, end + 1);
            }
            return objectMapper.readTree(cleaned);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse AI response as JSON: " + e.getMessage());
        }
    }

    private List<String> parseList(JsonNode node, String field) {
        List<String> result = new ArrayList<>();
        JsonNode arr = node.path(field);
        if (arr.isArray()) {
            arr.forEach(item -> result.add(item.asText()));
        }
        return result;
    }

    private double calculateConfidence(SpeakingResult partial, CriteriaScore pronunciation) {
        int[] bands = {
            partial.getFluencyCoherence().getBand(),
            partial.getLexicalResource().getBand(),
            partial.getGrammaticalRangeAccuracy().getBand(),
            pronunciation.getBand()
        };
        double avg = Arrays.stream(bands).average().orElse(0);
        double variance = Arrays.stream(bands)
                .mapToDouble(b -> Math.pow(b - avg, 2))
                .average()
                .orElse(0);
        double stdDev = Math.sqrt(variance);
        double consistencyScore = Math.max(0, 1.0 - (stdDev / 4.0));
        return Math.round(consistencyScore * 100.0) / 100.0;
    }
}
