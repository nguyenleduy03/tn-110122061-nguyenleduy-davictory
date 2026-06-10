package com.victory.aiwriting.infrastructure.vector;

import com.victory.aiwriting.domain.model.SampleEssay;
import com.victory.aiwriting.domain.port.VectorStorePort;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import java.io.File;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
public class SimpleVectorStoreAdapter implements VectorStorePort {

    private final SimpleVectorStore store;
    private final String persistPath;
    private int documentCount = 0;

    public SimpleVectorStoreAdapter(SimpleVectorStore store, String persistPath) {
        this.store = store;
        this.persistPath = persistPath;
        countLoadedDocuments();
    }

    private void countLoadedDocuments() {
        var file = new File(persistPath);
        if (file.exists() && file.length() > 20) {
            try {
                var mapper = new ObjectMapper();
                var root = mapper.readTree(file);
                documentCount = root.size();
                log.info("Loaded {} documents from vector store file: {}", documentCount, persistPath);
            } catch (Exception e) {
                log.warn("Could not read vector store file, will reindex: {}", e.getMessage());
            }
        }
    }

    @Override
    public void initialize(List<SampleEssay> samples) {
        if (samples.isEmpty()) {
            log.warn("No samples to index");
            return;
        }

        var docs = samples.stream()
            .map(s -> {
                var metadata = new HashMap<String, Object>();
                metadata.put("id", s.getId());
                metadata.put("taskType", s.getTaskType());
                metadata.put("topic", s.getTopic() != null ? s.getTopic() : "");
                metadata.put("promptText", s.getPromptText() != null ? s.getPromptText() : "");
                metadata.put("bandScore", s.getBandScore());
                metadata.put("essayText", s.getEssayText());
                metadata.put("examinerComment", s.getExaminerComment() != null ? s.getExaminerComment() : "");
                metadata.put("hasComment", s.isHasComment());
                metadata.put("wordCount", s.getWordCount());

                String promptContext = s.getPromptText() != null && !s.getPromptText().isBlank()
                    ? s.getPromptText().substring(0, Math.min(s.getPromptText().length(), 500))
                    : "";
                String textForEmbed = String.format("Task: %s | Topic: %s | Band: %.1f | Prompt: %s | Essay: %s",
                    s.getTaskType(),
                    s.getTopic() != null ? s.getTopic() : "",
                    s.getBandScore(),
                    promptContext,
                    s.getEssayText() != null && s.getEssayText().length() > 3000
                        ? s.getEssayText().substring(0, 3000) : s.getEssayText());

                return new Document(textForEmbed, metadata);
            })
            .toList();

        store.add(docs);
        store.save(new File(persistPath));
        documentCount = docs.size();
        log.info("Indexed {} sample essays into vector store, saved to {}", documentCount, persistPath);
    }

    @Override
    public List<SearchResult> search(String queryText, int topK, Map<String, String> metadataFilter) {
        var request = SearchRequest.builder()
            .query(queryText)
            .topK(topK)
            .build();

        var results = store.similaritySearch(request);

        var filtered = results.stream()
            .filter(doc -> matchesFilter(doc.getMetadata(), metadataFilter))
            .toList();

        int size = filtered.size();
        for (int i = 0; i < size; i++) {
            filtered.get(i).getMetadata().put("_similarity", size > 1 ? 1.0 - (double) i / (size - 1) : 1.0);
        }

        return filtered.stream()
            .map(doc -> new SearchResult(
                ((Number) doc.getMetadata().getOrDefault("id", 0L)).longValue(),
                ((Number) doc.getMetadata().getOrDefault("_similarity", 0.0)).doubleValue(),
                doc.getMetadata()
            ))
            .toList();
    }

    @Override
    public boolean isInitialized() {
        return documentCount > 0;
    }

    @Override
    public long count() {
        return documentCount;
    }

    private boolean matchesFilter(Map<String, Object> metadata, Map<String, String> filter) {
        if (filter == null || filter.isEmpty()) return true;
        for (var entry : filter.entrySet()) {
            var value = metadata.get(entry.getKey());
            if (value == null || !value.toString().equals(entry.getValue())) {
                return false;
            }
        }
        return true;
    }
}
