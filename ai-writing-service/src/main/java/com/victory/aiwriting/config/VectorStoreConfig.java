package com.victory.aiwriting.config;

import com.victory.aiwriting.domain.port.VectorStorePort;
import com.victory.aiwriting.infrastructure.vector.SimpleVectorStoreAdapter;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.io.File;

@Configuration
public class VectorStoreConfig {

    @Value("${spring.ai.vectorstore.simple.persist-path}")
    private String persistPath;

    @Bean
    public SimpleVectorStore simpleVectorStore(EmbeddingModel embeddingModel) {
        var store = SimpleVectorStore.builder(embeddingModel).build();
        var file = new File(persistPath);
        if (file.exists() && file.length() > 0) {
            store.load(file);
        }
        return store;
    }

    @Bean
    public VectorStorePort vectorStorePort(SimpleVectorStore simpleVectorStore) {
        return new SimpleVectorStoreAdapter(simpleVectorStore, persistPath);
    }
}
