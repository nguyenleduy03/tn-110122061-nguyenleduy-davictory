package com.victory.aispeaking.config;

import com.victory.aispeaking.domain.port.STTProvider;
import com.victory.aispeaking.domain.port.TTSProvider;
import com.victory.aispeaking.infrastructure.provider.OpenAITTSProvider;
import com.victory.aispeaking.infrastructure.provider.WhisperSTTProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProviderConfig {

    @Bean
    public STTProvider sttProvider(AIConfigProperties config) {
        return new WhisperSTTProvider(config);
    }

    @Bean
    public TTSProvider ttsProvider(AIConfigProperties config) {
        return new OpenAITTSProvider(config);
    }
}
