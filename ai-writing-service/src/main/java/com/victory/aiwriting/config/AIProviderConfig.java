package com.victory.aiwriting.config;

import com.victory.aiwriting.domain.port.EmbeddingService;
import com.victory.aiwriting.infrastructure.embedding.TransformersEmbeddingAdapter;
import com.victory.aiwriting.infrastructure.provider.DynamicAIProvider;
import org.springframework.ai.transformers.TransformersEmbeddingModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class AIProviderConfig {

    @Bean
    @Primary
    public TransformersEmbeddingModel transformersEmbeddingModel() {
        return new TransformersEmbeddingModel();
    }

    @Bean
    public EmbeddingService embeddingService(TransformersEmbeddingModel embeddingModel) {
        return new TransformersEmbeddingAdapter(embeddingModel);
    }

    @Bean
    public DynamicAIProvider aiProvider(AIConfigProperties config) {
        return new DynamicAIProvider(
            config.getApiKeys(),
            config.getGeminiApiKey(),
            "https://api.groq.com/openai",
            config.getProvider(),
            config.getModel(),
            0.1,
            4096
        );
    }
}
