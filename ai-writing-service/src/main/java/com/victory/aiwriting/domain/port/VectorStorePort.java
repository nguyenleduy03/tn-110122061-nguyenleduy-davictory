package com.victory.aiwriting.domain.port;

import com.victory.aiwriting.domain.model.SampleEssay;
import java.util.List;
import java.util.Map;

public interface VectorStorePort {
    void initialize(List<SampleEssay> samples);
    List<SearchResult> search(String queryText, int topK, Map<String, String> metadataFilter);
    boolean isInitialized();
    long count();

    record SearchResult(Long id, double similarity, Map<String, Object> metadata) {}
}
