package com.victory.aiwriting.domain.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.victory.aiwriting.domain.model.AIGradingResult;
import com.victory.aiwriting.domain.model.CriteriaScore;
import com.victory.aiwriting.exception.AIParseException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResponseParser {

    private final ObjectMapper objectMapper;

    public AIGradingResult parse(String rawResponse, String provider, String model) {
        try {
            String json = extractJson(rawResponse);
            var node = objectMapper.readTree(json);
            validateRequired(node);

            var result = AIGradingResult.builder()
                .provider(provider)
                .model(model)
                .overallBand(node.get("overallBand").asDouble())
                .taskResponse(parseCriteriaScore(node, "taskResponse"))
                .coherenceCohesion(parseCriteriaScore(node, "coherenceCohesion"))
                .lexicalResource(parseCriteriaScore(node, "lexicalResource"))
                .grammaticalRange(parseCriteriaScore(node, "grammaticalRange"))
                .overallFeedback(getNullableText(node, "overallFeedback"))
                .improvementPriority(parseStringArray(node, "improvementPriority"))
                .confidenceScore(node.has("confidenceScore") ? node.get("confidenceScore").asDouble() : 0.0)
                .status("COMPLETED")
                .build();

            result.setStrengths(collectAllStrengths(node));
            result.setWeaknesses(collectAllWeaknesses(node));

            return result;

        } catch (Exception e) {
            throw new AIParseException("Failed to parse LLM response: " + e.getMessage(), e, rawResponse);
        }
    }

    private String extractJson(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new AIParseException("Empty response from LLM");
        }
        raw = raw.trim();
        if (raw.startsWith("```json")) {
            raw = raw.substring(7);
        } else if (raw.startsWith("```")) {
            raw = raw.substring(3);
        }
        if (raw.endsWith("```")) {
            raw = raw.substring(0, raw.length() - 3);
        }
        return raw.trim();
    }

    private void validateRequired(JsonNode node) {
        String[] required = {"overallBand", "criteria", "overallFeedback"};
        for (String field : required) {
            if (!node.has(field) || node.get(field).isNull()) {
                throw new AIParseException("Missing required field: " + field);
            }
        }
    }

    private CriteriaScore parseCriteriaScore(JsonNode root, String field) {
        var node = root.get("criteria");
        if (node == null || !node.has(field)) {
            return CriteriaScore.builder().band(0.0).build();
        }
        var c = node.get(field);
        return CriteriaScore.builder()
            .band(c.has("band") ? c.get("band").asDouble() : 0.0)
            .bandJustification(getNullableText(c, "bandJustification"))
            .strengths(parseStringArray(c, "strengths"))
            .weaknesses(parseStringArray(c, "weaknesses"))
            .evidenceFromEssay(parseStringArray(c, "evidenceFromEssay"))
            .detailedFeedback(getNullableText(c, "detailedFeedback"))
            .build();
    }

    private List<String> parseStringArray(JsonNode node, String field) {
        var list = new ArrayList<String>();
        if (node.has(field) && node.get(field).isArray()) {
            node.get(field).forEach(n -> list.add(n.asText()));
        }
        return list;
    }

    private String getNullableText(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull()
            ? node.get(field).asText() : null;
    }

    private List<String> collectAllStrengths(JsonNode root) {
        var list = new ArrayList<String>();
        var criteria = root.get("criteria");
        if (criteria != null) {
            criteria.fieldNames().forEachRemaining(name -> {
                var c = criteria.get(name);
                if (c.has("strengths") && c.get("strengths").isArray()) {
                    c.get("strengths").forEach(n -> list.add("[" + name + "] " + n.asText()));
                }
            });
        }
        return list;
    }

    private List<String> collectAllWeaknesses(JsonNode root) {
        var list = new ArrayList<String>();
        var criteria = root.get("criteria");
        if (criteria != null) {
            criteria.fieldNames().forEachRemaining(name -> {
                var c = criteria.get(name);
                if (c.has("weaknesses") && c.get("weaknesses").isArray()) {
                    c.get("weaknesses").forEach(n -> list.add("[" + name + "] " + n.asText()));
                }
            });
        }
        return list;
    }
}
