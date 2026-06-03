package com.victory.aispeaking.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "app.ai")
@Data
public class AIConfigProperties {
    private ProviderConfig conversation = new ProviderConfig();
    private ProviderConfig scoring = new ProviderConfig();
    private FeaturesConfig features = new FeaturesConfig();
    private QuotaConfig quota = new QuotaConfig();
    private CacheConfig cache = new CacheConfig();
    private PromptConfig prompt = new PromptConfig();
    private SttConfig stt = new SttConfig();
    private TtsConfig tts = new TtsConfig();
    private PronunciationConfig pronunciation = new PronunciationConfig();
    private SessionConfig session = new SessionConfig();

    @Data
    public static class ProviderConfig {
        private String provider = "groq";
        private String baseUrl = "https://api.groq.com/openai";
        private String model = "llama-3.3-70b-versatile";
        private List<String> apiKeys;
        private double temperature = 0.3;
        private int maxTokens = 1024;
    }

    @Data
    public static class FeaturesConfig {
        private boolean speakingGrading = true;
        private boolean realtimeStt = true;
        private boolean realtimeTts = true;
        private boolean pronunciationFromAudio = true;
        private boolean nlpFeatureExtraction = true;
    }

    @Data
    public static class QuotaConfig {
        private int studentPerDay = 10;
        private int teacherPerDay = 100;
        private int adminPerDay = 500;

        public int getQuotaForRole(String role) {
            return switch (role.toUpperCase()) {
                case "STUDENT" -> studentPerDay;
                case "TEACHER" -> teacherPerDay;
                case "MANAGER", "ADMIN" -> adminPerDay;
                default -> studentPerDay;
            };
        }
    }

    @Data
    public static class CacheConfig {
        private boolean enabled = true;
        private int ttlMinutes = 1440;
        private int maxSize = 500;
    }

    @Data
    public static class PromptConfig {
        private String version = "v2.0";
        private int maxAnswerLength = 2000;
        private boolean includeFeatureAnalysis = true;
        private boolean useCotReasoning = true;
    }

    @Data
    public static class SttConfig {
        private String provider = "openai";
        private String model = "whisper-1";
        private String language = "en";
        private String responseFormat = "verbose_json";
        private boolean enableWordConfidence = true;
    }

    @Data
    public static class TtsConfig {
        private String provider = "openai";
        private String model = "tts-1";
        private String voice = "alloy";
        private double speed = 1.0;
    }

    @Data
    public static class PronunciationConfig {
        private double minWordConfidence = 0.6;
        private double confidenceWeight = 0.7;
        private double speechRateWeight = 0.3;
        private List<Integer> expectedRateRange = List.of(80, 160);
    }

    @Data
    public static class SessionConfig {
        private int maxTurns = 50;
        private int maxDurationMinutes = 30;
        private int part1DurationMinutes = 5;
        private int part2DurationMinutes = 4;
        private int part3DurationMinutes = 5;
        private int prepTimeSeconds = 60;
        private int longTurnSeconds = 120;
    }
}
