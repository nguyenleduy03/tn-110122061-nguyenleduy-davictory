package com.victory.aiwriting.config;

import com.victory.aiwriting.domain.port.VectorStorePort;
import com.victory.aiwriting.infrastructure.vector.SimpleVectorStoreAdapter;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class VectorStoreConfig {

    @Bean
    public SimpleVectorStore simpleVectorStore(EmbeddingModel embeddingModel) {
        return SimpleVectorStore.builder(embeddingModel).build();
    }

    @Bean
    public VectorStorePort vectorStorePort(SimpleVectorStore simpleVectorStore) {
        return new SimpleVectorStoreAdapter(simpleVectorStore);
    }
}
