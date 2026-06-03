package com.victory.aispeaking.config;

import com.victory.aispeaking.domain.port.AIProvider;
import com.victory.aispeaking.infrastructure.provider.DynamicAIProvider;
import com.victory.aispeaking.infrastructure.provider.ScoringAIProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class AIProviderConfig {

    @Bean
    @Primary
    public DynamicAIProvider conversationAIProvider(AIConfigProperties config) {
        AIConfigProperties.ProviderConfig convConfig = config.getConversation();
        return new DynamicAIProvider(
            convConfig.getApiKeys(),
            convConfig.getBaseUrl(),
            convConfig.getProvider(),
            convConfig.getModel(),
            convConfig.getTemperature(),
            convConfig.getMaxTokens()
        );
    }

    @Bean
    public ScoringAIProvider scoringAIProvider(AIConfigProperties config) {
        AIConfigProperties.ProviderConfig scoreConfig = config.getScoring();
        return new ScoringAIProvider(
            scoreConfig.getApiKeys(),
            scoreConfig.getBaseUrl(),
            scoreConfig.getModel(),
            scoreConfig.getTemperature(),
            scoreConfig.getMaxTokens()
        );
    }

    @Bean
    public AIProvider conversationProvider(DynamicAIProvider dynamicAIProvider) {
        return dynamicAIProvider;
    }

    @Bean
    public AIProvider scoringProvider(ScoringAIProvider scoringAIProvider) {
        return scoringAIProvider;
    }
}
