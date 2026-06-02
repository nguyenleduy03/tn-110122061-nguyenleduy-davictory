package com.victory.aiwriting.domain.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.victory.aiwriting.domain.model.RubricBand;
import com.victory.aiwriting.domain.model.WritingRubric;
import com.victory.aiwriting.exception.AIGradingException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RubricLoader {

    private final ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager entityManager;

    public WritingRubric loadForTask(String taskCode) {
        var list = entityManager.createNativeQuery("""
            SELECT wsc.code, wsc.display_name, wsc.band_descriptors
            FROM writing_scoring_criteria wsc
            JOIN writing_tasks wt ON wt.id = wsc.writing_task_id
            WHERE wt.code = :taskCode AND wsc.is_active = true
            ORDER BY wsc.order_index
            """)
            .setParameter("taskCode", taskCode)
            .getResultList();

        if (list.isEmpty()) {
            throw new AIGradingException("No rubric found for task: " + taskCode);
        }

        var builder = WritingRubric.builder().taskType(taskCode);
        var rubricSummary = new HashMap<String, String>();

        for (Object row : list) {
            Object[] cols = (Object[]) row;
            String code = (String) cols[0];
            String displayName = (String) cols[1];
            String bandDescriptorsJson = (String) cols[2];

            var bands = parseBandDescriptors(bandDescriptorsJson);
            rubricSummary.put(code, displayName);

            switch (code) {
                case "TA", "TR" -> builder.taskResponse(bands);
                case "CC" -> builder.coherenceCohesion(bands);
                case "LR" -> builder.lexicalResource(bands);
                case "GRA" -> builder.grammaticalRange(bands);
            }
        }

        builder.rubricSummary(rubricSummary);
        return builder.build();
    }

    private List<RubricBand> parseBandDescriptors(String json) {
        if (json == null || json.isBlank()) return List.of();

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.readValue(json,
                new TypeReference<Map<String, Object>>() {});
            return map.entrySet().stream()
                .filter(e -> e.getKey().startsWith("band"))
                .map(e -> {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> val = (Map<String, Object>) e.getValue();

                    @SuppressWarnings("unchecked")
                    var indicators = val.get("keyIndicators") instanceof List
                        ? (List<String>) val.get("keyIndicators") : List.<String>of();

                    @SuppressWarnings("unchecked")
                    var errors = val.get("commonErrors") instanceof List
                        ? (List<String>) val.get("commonErrors") : List.<String>of();

                    return RubricBand.builder()
                        .band(Double.parseDouble(e.getKey().replace("band", "")))
                        .descriptor((String) val.getOrDefault("descriptor", ""))
                        .summary((String) val.getOrDefault("summary", ""))
                        .keyIndicators(indicators)
                        .commonErrors(errors)
                        .build();
                })
                .sorted(Comparator.comparingDouble(RubricBand::getBand))
                .toList();
        } catch (Exception e) {
            log.warn("Failed to parse band descriptors JSON: {}", e.getMessage());
            return List.of();
        }
    }

    public String detectTaskType(Long questionGroupId) {
        var result = entityManager.createNativeQuery("""
            SELECT wt.code
            FROM question_groups qg
            JOIN test_parts tp ON tp.id = qg.part_id
            JOIN sessions s ON s.id = tp.session_id
            JOIN tests t ON t.id = s.test_id
            JOIN writing_tasks wt ON wt.code = CONCAT('TASK', tp.order_index, '_', 
                CASE WHEN t.test_type = 'ACADEMIC' THEN 'ACADEMIC' ELSE 'GENERAL' END)
            WHERE qg.id = :questionGroupId
            """)
            .setParameter("questionGroupId", questionGroupId)
            .getResultList();

        if (result.isEmpty()) return "TASK2_ACADEMIC";
        return (String) result.get(0);
    }

    public String detectTopic(Long questionGroupId) {
        var result = entityManager.createNativeQuery("""
            SELECT qg.title
            FROM question_groups qg
            WHERE qg.id = :questionGroupId
            """)
            .setParameter("questionGroupId", questionGroupId)
            .getResultList();

        return result.isEmpty() ? "General" : (String) result.get(0);
    }
}
