package com.victory.aispeaking.domain.service;

import com.victory.aispeaking.domain.model.*;
import com.victory.aispeaking.domain.port.AIProvider;
import com.victory.aispeaking.infrastructure.provider.ScoringAIProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ScoringPipeline {

    private static final String COMPREHENSIVE_PROMPT_PATH = "ai/prompt/templates/scoring_comprehensive.txt";

    private final AIProvider conversationProvider;
    private final AIProvider scoringProvider;
    private final GradeCalculator gradeCalculator;
    private final FeatureAnalyzer featureAnalyzer;
    private final RubricLoader rubricLoader;
    private final PronunciationEngine pronunciationEngine;

    private final String comprehensivePromptTemplate;

    public ScoringPipeline(
            AIProvider conversationProvider,
            ScoringAIProvider scoringProvider,
            GradeCalculator gradeCalculator,
            FeatureAnalyzer featureAnalyzer,
            RubricLoader rubricLoader,
            PronunciationEngine pronunciationEngine) {
        this.conversationProvider = conversationProvider;
        this.scoringProvider = scoringProvider;
        this.gradeCalculator = gradeCalculator;
        this.featureAnalyzer = featureAnalyzer;
        this.rubricLoader = rubricLoader;
        this.pronunciationEngine = pronunciationEngine;

        try {
            ClassPathResource resource = new ClassPathResource(COMPREHENSIVE_PROMPT_PATH);
            this.comprehensivePromptTemplate = new String(
                    resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load comprehensive scoring template", e);
        }
    }

    public SpeakingResult evaluateFullSession(
            String sessionId, Long userId,
            List<SpeakingTurn> allTurns) {

        long startTime = System.currentTimeMillis();
        log.info("Starting comprehensive speaking evaluation for session: {}", sessionId);

        String dominantPart = detectDominantPart(allTurns);
        FeatureAnalysis features = featureAnalyzer.analyze(allTurns);

        PronunciationEngine.PronunciationMetrics pronMetrics;
        if (allTurns.stream().anyMatch(t -> t.getAnswerDurationMs() > 0)) {
            pronMetrics = pronunciationEngine.analyze(allTurns, Optional.empty());
        } else {
            pronMetrics = pronunciationEngine.analyzeWithoutAudio(allTurns);
        }

        String prompt = buildComprehensivePrompt(allTurns, dominantPart, features, pronMetrics);

        PromptContext promptContext = PromptContext.builder()
                .systemPrompt("You are an official IELTS Speaking Examiner.")
                .userSection(prompt)
                .estimatedTokens(countTokens(prompt))
                .build();

        for (int retry = 0; retry <= 2; retry++) {
            try {
                String response = scoringProvider.chat(promptContext);
                long latency = System.currentTimeMillis() - startTime;

                SpeakingResult result = parseComprehensiveResponse(
                        response, sessionId, userId,
                        scoringProvider.getProviderName(),
                        scoringProvider.getModelName(),
                        latency);

                if (result.getStatus().equals("COMPLETED") || retry == 2) {
                    long elapsed = System.currentTimeMillis() - startTime;
                    log.info("Evaluation completed in {}ms. Overall band: {}",
                            elapsed, result.getOverallBand());
                    return result;
                }
            } catch (Exception e) {
                log.warn("Scoring attempt {}/3 failed: {}", retry + 1, e.getMessage());
            }
        }

        return SpeakingResult.builder()
                .sessionId(sessionId).userId(userId)
                .fluencyCoherence(CriteriaScore.empty("FC", "Fluency and Coherence"))
                .lexicalResource(CriteriaScore.empty("LR", "Lexical Resource"))
                .grammaticalRangeAccuracy(CriteriaScore.empty("GRA", "Grammatical Range and Accuracy"))
                .pronunciation(CriteriaScore.empty("P", "Pronunciation"))
                .overallBand(0)
                .status("FAILED")
                .errorMessage("All 3 scoring attempts failed")
                .createdAt(LocalDateTime.now())
                .build();
    }

    private String buildComprehensivePrompt(
            List<SpeakingTurn> turns, String part,
            FeatureAnalysis features,
            PronunciationEngine.PronunciationMetrics pronMetrics) {

        String qaBlock = turns.stream()
                .filter(t -> t.getAnswerText() != null && !t.getAnswerText().isBlank())
                .map(t -> String.format("[%s] Q: %s\n[%s] A: %s\n",
                        t.getQuestionId(), t.getQuestionText(),
                        t.getQuestionId(), t.getAnswerText()))
                .collect(Collectors.joining("\n"));

        String featureReport = featureAnalyzer.buildFeatureReport(features);

        String pronReport = String.format(
                "- Pronunciation band (audio-based): %d/9%n" +
                "- Word confidence ratio: %.2f%n" +
                "- Speech rate: %.1f words/min%n" +
                "- Hesitation count: %d%n" +
                "- Notable issues: %s%n",
                pronMetrics.band(),
                pronMetrics.confidenceRatio(),
                pronMetrics.speechRate(),
                pronMetrics.hesitationCount(),
                pronMetrics.notableIssues().isEmpty() ? "none" : pronMetrics.notableIssues()
        );

        String prompt = comprehensivePromptTemplate
                .replace("{{part}}", part)
                .replace("{{turn_count}}", String.valueOf(
                        turns.stream().filter(t -> t.getAnswerText() != null).count()))
                .replace("{{transcript}}", qaBlock)
                .replace("{{feature_analysis}}", featureReport)
                .replace("{{pronunciation_metrics}}", pronReport);

        return prompt;
    }

    @SuppressWarnings("unchecked")
    private SpeakingResult parseComprehensiveResponse(
            String rawResponse, String sessionId, Long userId,
            String provider, String model, long latencyMs) {

        try {
            String cleaned = rawResponse
                    .replaceAll("```json\\n?", "")
                    .replaceAll("```\\n?", "")
                    .trim();
            int start = cleaned.indexOf('{');
            int end = cleaned.lastIndexOf('}');
            if (start >= 0 && end > start) {
                cleaned = cleaned.substring(start, end + 1);
            }

            com.fasterxml.jackson.databind.ObjectMapper mapper =
                    new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(cleaned);

            double overallBand = root.path("overallBand").asDouble(0);
            double confidenceScore = root.path("confidenceScore").asDouble(0.7);
            String overallFeedback = root.path("overallFeedback").asText("");
            List<String> improvementPriority = parseList(root, "improvementPriority");

            com.fasterxml.jackson.databind.JsonNode criteria = root.path("criteria");

            CriteriaScore fc = parseCriteria(criteria, "fluency_coherence", "FC", "Fluency and Coherence");
            CriteriaScore lr = parseCriteria(criteria, "lexical_resource", "LR", "Lexical Resource");
            CriteriaScore gra = parseCriteria(criteria, "grammatical_range_accuracy", "GRA",
                    "Grammatical Range and Accuracy");
            CriteriaScore p = parseCriteria(criteria, "pronunciation", "P", "Pronunciation");

            List<String> strengths = new ArrayList<>();
            List<String> weaknesses = new ArrayList<>();
            for (CriteriaScore cs : List.of(fc, lr, gra, p)) {
                if (cs.getStrengths() != null) strengths.addAll(cs.getStrengths());
                if (cs.getWeaknesses() != null) weaknesses.addAll(cs.getWeaknesses());
            }

            return SpeakingResult.builder()
                    .id(UUID.randomUUID().toString())
                    .sessionId(sessionId)
                    .userId(userId)
                    .overallBand(overallBand)
                    .fluencyCoherence(fc)
                    .lexicalResource(lr)
                    .grammaticalRangeAccuracy(gra)
                    .pronunciation(p)
                    .overallFeedback(overallFeedback)
                    .improvementPriority(improvementPriority)
                    .strengths(strengths)
                    .weaknesses(weaknesses)
                    .provider(provider)
                    .model(model)
                    .confidenceScore(confidenceScore)
                    .promptVersion("v2.0-comprehensive")
                    .latencyMs(latencyMs)
                    .status("COMPLETED")
                    .createdAt(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse comprehensive scoring response: {}", e.getMessage());
            return SpeakingResult.builder()
                    .sessionId(sessionId).userId(userId)
                    .fluencyCoherence(CriteriaScore.empty("FC", "Fluency and Coherence"))
                    .lexicalResource(CriteriaScore.empty("LR", "Lexical Resource"))
                    .grammaticalRangeAccuracy(CriteriaScore.empty("GRA", "Grammatical Range and Accuracy"))
                    .pronunciation(CriteriaScore.empty("P", "Pronunciation"))
                    .overallBand(0)
                    .status("FAILED")
                    .errorMessage("Parse error: " + e.getMessage())
                    .createdAt(LocalDateTime.now())
                    .build();
        }
    }

    private CriteriaScore parseCriteria(
            com.fasterxml.jackson.databind.JsonNode criteria, String key,
            String code, String displayName) {

        com.fasterxml.jackson.databind.JsonNode node = criteria.path(key);
        if (node.isMissingNode()) {
            return CriteriaScore.empty(code, displayName);
        }

        return CriteriaScore.builder()
                .code(code)
                .displayName(displayName)
                .band(node.path("band").asInt(0))
                .strengths(parseList(node, "strengths"))
                .weaknesses(parseList(node, "weaknesses"))
                .detailedFeedback(node.path("detailedFeedback").asText(""))
                .build();
    }

    private List<String> parseList(com.fasterxml.jackson.databind.JsonNode node, String field) {
        List<String> result = new ArrayList<>();
        com.fasterxml.jackson.databind.JsonNode arr = node.path(field);
        if (arr.isArray()) {
            arr.forEach(item -> result.add(item.asText()));
        }
        return result;
    }

    private String detectDominantPart(List<SpeakingTurn> turns) {
        long part1 = turns.stream().filter(t -> "PART1".equals(t.getPart())).count();
        long part2 = turns.stream().filter(t -> "PART2".equals(t.getPart())).count();
        long part3 = turns.stream().filter(t -> "PART3".equals(t.getPart())).count();
        if (part1 >= part2 && part1 >= part3) return "PART1";
        if (part2 >= part1 && part2 >= part3) return "PART2";
        return "PART3";
    }

    private int countTokens(String text) {
        return text.length() / 4;
    }
}
