package com.victory.aispeaking.infrastructure.provider;

import com.victory.aispeaking.config.AIConfigProperties;
import com.victory.aispeaking.domain.port.TTSProvider;
import lombok.extern.slf4j.Slf4j;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

@Slf4j
public class OpenAITTSProvider implements TTSProvider {

    private final AIConfigProperties config;
    private final HttpClient httpClient;

    public OpenAITTSProvider(AIConfigProperties config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(30))
                .build();
    }

    @Override
    public InputStream synthesize(String text, String voiceId) {
        byte[] audio = synthesizeBytes(text, voiceId);
        return new ByteArrayInputStream(audio);
    }

    @Override
    public byte[] synthesizeBytes(String text, String voiceId) {
        try {
            String apiKey = getApiKey();
            String voice = voiceId != null ? voiceId : config.getTts().getVoice();
            String json = String.format("""
                    {"model":"%s","input":"%s","voice":"%s","speed":%.1f}
                    """, config.getTts().getModel(),
                    escapeJson(text), voice, config.getTts().getSpeed());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/audio/speech"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<byte[]> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() == 200) {
                return response.body();
            } else {
                log.error("TTS API error: {} - {}", response.statusCode(),
                        new String(response.body()));
                return new byte[0];
            }
        } catch (Exception e) {
            log.error("TTS synthesis failed: {}", e.getMessage());
            return new byte[0];
        }
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    private String getApiKey() {
        AIConfigProperties.ProviderConfig scoreConfig = config.getScoring();
        if (scoreConfig.getApiKeys() != null && !scoreConfig.getApiKeys().isEmpty()) {
            return scoreConfig.getApiKeys().get(0);
        }
        AIConfigProperties.ProviderConfig convConfig = config.getConversation();
        if (convConfig.getApiKeys() != null && !convConfig.getApiKeys().isEmpty()) {
            return convConfig.getApiKeys().get(0);
        }
        return System.getenv("OPENAI_API_KEY");
    }

    private String escapeJson(String text) {
        return text.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
