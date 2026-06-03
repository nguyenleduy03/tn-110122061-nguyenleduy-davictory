package com.victory.aiwriting.domain.service;

import com.victory.aiwriting.domain.model.SampleEssay;
import com.victory.aiwriting.domain.port.VectorStorePort;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SampleEssayIndexer implements CommandLineRunner {

    private final VectorStorePort vectorStore;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public void run(String... args) {
        if (vectorStore.isInitialized()) {
            log.info("Vector store already initialized, found {} samples", vectorStore.count());
            return;
        }
        log.info("Vector store not initialized. Use POST /api/admin/ai/reindex to index samples.");
    }

    public void indexAll() {
        log.info("Loading sample essays from database...");
        var samples = loadSamplesFromDB();

        if (samples.isEmpty()) {
            log.warn("No sample essays found in database");
            return;
        }

        vectorStore.initialize(samples);
        log.info("Indexed {} sample essays into vector store", samples.size());
    }

    public List<SampleEssay> loadSamplesFromDB() {
        try {
            var rows = entityManager.createNativeQuery("""
                SELECT wsa.id,
                       COALESCE(wp.topic, 'General'),
                       wt.code as task_type,
                       COALESCE(wp.prompt_text, '') as prompt_text,
                       wsa.answer_text,
                       wsa.band_score,
                       COALESCE(wsa.annotation, ''),
                       COALESCE(wsa.word_count, 0)
                FROM writing_sample_answers wsa
                JOIN writing_prompts wp ON wp.id = wsa.writing_prompt_id
                JOIN writing_tasks wt ON wt.id = wp.writing_task_id
                WHERE wsa.is_active = true
                """).getResultList();

            var samples = new ArrayList<SampleEssay>();
            for (Object row : rows) {
                Object[] cols = (Object[]) row;
                samples.add(SampleEssay.builder()
                    .id(((Number) cols[0]).longValue())
                    .topic((String) cols[1])
                    .taskType((String) cols[2])
                    .promptText((String) cols[3])
                    .essayText((String) cols[4])
                    .bandScore(cols[5] != null ? ((Number) cols[5]).doubleValue() : 0.0)
                    .examinerComment((String) cols[6])
                    .hasComment(cols[6] != null && !((String) cols[6]).isBlank())
                    .wordCount(((Number) cols[7]).intValue())
                    .build());
            }
            log.info("Loaded {} samples from DB", samples.size());
            return samples;

        } catch (Exception e) {
            log.warn("Could not load sample essays from DB: {}", e.getMessage());
            return List.of();
        }
    }
}
