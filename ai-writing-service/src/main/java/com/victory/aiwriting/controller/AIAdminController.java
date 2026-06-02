package com.victory.aiwriting.controller;

import com.victory.aiwriting.config.AIConfigProperties;
import com.victory.aiwriting.domain.port.VectorStorePort;
import com.victory.aiwriting.domain.service.SampleEssayIndexer;
import com.victory.aiwriting.infrastructure.cache.AICacheService;
import com.victory.aiwriting.infrastructure.provider.DynamicAIProvider;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
public class AIAdminController {

    @PersistenceContext
    private EntityManager em;

    private final AIConfigProperties config;
    private final AICacheService cacheService;
    private final SampleEssayIndexer sampleEssayIndexer;
    private final VectorStorePort vectorStore;
    private final DynamicAIProvider aiProvider;

    @GetMapping("/samples/count")
    public ResponseEntity<?> getSampleCount() {
        long dbCount = 0;
        try {
            dbCount = ((Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM writing_sample_answers WHERE is_active = true")
                .getSingleResult()).longValue();
        } catch (Exception e) {
            // DB may not be available
        }
        return ResponseEntity.ok(Map.of(
            "dbCount", dbCount,
            "vectorStoreIndexed", vectorStore.isInitialized()
        ));
    }

    @PostMapping("/samples")
    @Transactional
    public ResponseEntity<?> addSample(@RequestBody Map<String, Object> body) {
        try {
            String taskType = (String) body.getOrDefault("taskType", "TASK2_ACADEMIC");
            String topic = (String) body.getOrDefault("topic", "General");
            String promptText = (String) body.getOrDefault("promptText", "");
            String essayText = (String) body.get("essayText");
            Double bandScore = body.get("bandScore") instanceof Number
                ? ((Number) body.get("bandScore")).doubleValue() : 6.0;
            String examinerComment = (String) body.getOrDefault("examinerComment", "");
            String sourceId = (String) body.getOrDefault("sourceId", "");

            if (essayText == null || essayText.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "essayText is required"));
            }

            // Dedup by sourceId — update annotation if provided
            if (!sourceId.isEmpty()) {
                var dup = em.createNativeQuery(
                    "SELECT id FROM writing_sample_answers WHERE structure_notes = :sid LIMIT 1")
                    .setParameter("sid", sourceId)
                    .getResultList();
                if (!dup.isEmpty()) {
                    Long existingId = ((Number) dup.get(0)).longValue();
                    if (examinerComment != null && !examinerComment.isEmpty()) {
                        em.createNativeQuery(
                            "UPDATE writing_sample_answers SET annotation = :ann WHERE id = :id")
                            .setParameter("ann", examinerComment)
                            .setParameter("id", existingId)
                            .executeUpdate();
                    }
                    return ResponseEntity.ok(Map.of(
                        "status", "duplicate", "id", existingId, "sourceId", sourceId));
                }
            }

            Long taskId = getOrCreateTaskId(taskType);
            Long promptId = getOrCreatePromptId(taskId, topic, promptText);

            em.createNativeQuery("""
                INSERT INTO writing_sample_answers
                    (writing_prompt_id, created_by, band_score, answer_text,
                     word_count, annotation, structure_notes, is_active, created_at, updated_at)
                VALUES (:promptId, 1, :bandScore, :essayText,
                        :wordCount, :annotation, :sourceId, true, NOW(), NOW())
                """)
                .setParameter("promptId", promptId)
                .setParameter("bandScore", bandScore)
                .setParameter("essayText", essayText)
                .setParameter("wordCount", essayText.split("\\s+").length)
                .setParameter("annotation", examinerComment)
                .setParameter("sourceId", sourceId)
                .executeUpdate();

            return ResponseEntity.ok(Map.of("status", "saved", "taskType", taskType, "bandScore", bandScore));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Long getOrCreateTaskId(String taskCode) {
        var result = em.createNativeQuery(
            "SELECT id FROM writing_tasks WHERE code = :code")
            .setParameter("code", taskCode)
            .getResultList();
        if (!result.isEmpty()) return ((Number) result.get(0)).longValue();

        em.createNativeQuery("""
            INSERT INTO writing_tasks (code, display_name, description, min_words, recommended_words,
                duration_minutes, score_weight, order_index, is_active, created_at, updated_at)
            VALUES (:code, :display, :desc, 150, 250, 40, 1.0, 0, true, NOW(), NOW())
            """)
            .setParameter("code", taskCode)
            .setParameter("display", taskCode.replace("_", " "))
            .setParameter("desc", "Auto-created for AI grading")
            .executeUpdate();

        return ((Number) em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult()).longValue();
    }

    private Long getOrCreatePromptId(Long taskId, String topic, String promptText) {
        if (promptText == null || promptText.isBlank()) promptText = topic;

        var result = em.createNativeQuery(
            "SELECT id FROM writing_prompts WHERE writing_task_id = :taskId AND title = :topic LIMIT 1")
            .setParameter("taskId", taskId)
            .setParameter("topic", topic)
            .getResultList();
        if (!result.isEmpty()) return ((Number) result.get(0)).longValue();

        em.createNativeQuery("""
            INSERT INTO writing_prompts (writing_task_id, title, prompt_text, topic, order_index, is_active, created_at, updated_at)
            VALUES (:taskId, :topic, :promptText, :topic2, 0, true, NOW(), NOW())
            """)
            .setParameter("taskId", taskId)
            .setParameter("topic", topic)
            .setParameter("promptText", promptText)
            .setParameter("topic2", topic)
            .executeUpdate();

        return ((Number) em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult()).longValue();
    }

    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        return ResponseEntity.ok(Map.of(
            "provider", config.getProvider(),
            "model", config.getModel(),
            "features", config.getFeatures(),
            "quota", config.getQuota()
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        var cacheStats = cacheService.getStats();
        return ResponseEntity.ok(Map.of(
            "cache", cacheStats
        ));
    }

    @PostMapping("/reindex")
    public ResponseEntity<?> reindex() {
        try {
            sampleEssayIndexer.indexAll();
            return ResponseEntity.ok(Map.of("status", "REINDEXED"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Reindex failed: " + e.getMessage()));
        }
    }

    @PostMapping("/cache/clear")
    public ResponseEntity<?> clearCache() {
        cacheService.clear();
        return ResponseEntity.ok(Map.of("status", "CACHE_CLEARED"));
    }

    @GetMapping("/models")
    public ResponseEntity<?> listModels() {
        var models = DynamicAIProvider.AVAILABLE_MODELS.stream()
            .map(m -> Map.of(
                "label", m.label(),
                "model", m.model(),
                "provider", m.provider(),
                "baseUrl", m.baseUrl()
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of(
            "models", models,
            "current", aiProvider.getModelName(),
            "provider", aiProvider.getProviderName()
        ));
    }

    @PostMapping("/model")
    public ResponseEntity<?> switchModel(@RequestBody Map<String, String> body) {
        String model = body.get("model");
        if (model == null || model.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "model is required"));
        }
        try {
            aiProvider.switchModel(model);
            return ResponseEntity.ok(Map.of(
                "status", "switched",
                "model", aiProvider.getModelName(),
                "provider", aiProvider.getProviderName()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
