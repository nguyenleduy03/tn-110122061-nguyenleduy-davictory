package com.victory.aiwriting.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import java.util.ArrayList;
import java.util.List;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.ai")
public class AIConfigProperties {

    private String provider = "groq";
    private String model = "llama-3.3-70b-versatile";
    private List<String> apiKeys = new ArrayList<>();
    private String geminiApiKey = "";

    private FeaturesConfig features = new FeaturesConfig();
    private QuotaConfig quota = new QuotaConfig();
    private CacheConfig cache = new CacheConfig();

    @Data
    public static class FeaturesConfig {
        private boolean writingGrading = true;
        private boolean peerReviewMode = false;
        private double peerReviewThreshold = 0.80;
    }

    @Data
    public static class QuotaConfig {
        private int studentPerDay = 5;
        private int teacherPerDay = 50;
        private int adminPerDay = 200;

        public int getQuotaForRole(String role) {
            return switch (role.toUpperCase()) {
                case "STUDENT" -> studentPerDay;
                case "TEACHER" -> teacherPerDay;
                case "ADMIN", "MANAGER" -> adminPerDay;
                default -> 0;
            };
        }
    }

    @Data
    public static class CacheConfig {
        private boolean enabled = true;
        private int ttlMinutes = 1440;
        private int maxSize = 1000;
    }
}
