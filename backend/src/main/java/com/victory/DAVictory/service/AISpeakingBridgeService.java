package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.SpeakingResultDTO;
import com.victory.DAVictory.exception.AIGradingException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Service
public class AISpeakingBridgeService {

    private final RestClient restClient;

    @Value("${app.ai.speaking.service.url:http://localhost:5181}")
    private String aiSpeakingServiceUrl;

    public AISpeakingBridgeService() {
        this.restClient = RestClient.builder()
                .requestFactory(new JdkClientHttpRequestFactory())
                .build();
    }

    public Map<String, Object> createSession(String sessionId, Long userId, String userName,
                                              String userRole, Map<String, Object> config) {
        log.info("Creating AI speaking session for user {}", userId);
        try {
            return restClient.post()
                    .uri(aiSpeakingServiceUrl + "/api/ai/speaking/sessions")
                    .header("X-User-Id", String.valueOf(userId))
                    .header("X-User-Name", userName)
                    .header("X-User-Role", userRole)
                    .body(config)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("Failed to create speaking session: {}", e.getMessage());
            throw new AIGradingException("Failed to create speaking session: " + e.getMessage());
        }
    }

    public Map<String, Object> generateQuestion(String sessionId) {
        try {
            return restClient.post()
                    .uri(aiSpeakingServiceUrl + "/api/ai/speaking/sessions/{sessionId}/question", sessionId)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("Failed to generate question: {}", e.getMessage());
            throw new AIGradingException("Failed to generate question: " + e.getMessage());
        }
    }

    public Map<String, Object> submitAnswer(String sessionId, String answerText, Integer durationMs) {
        try {
            return restClient.post()
                    .uri(aiSpeakingServiceUrl + "/api/ai/speaking/sessions/{sessionId}/answer", sessionId)
                    .body(Map.of("answerText", answerText, "durationMs", durationMs))
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("Failed to submit answer: {}", e.getMessage());
            throw new AIGradingException("Failed to submit answer: " + e.getMessage());
        }
    }

    public SpeakingResultDTO evaluateSession(String sessionId, Long userId) {
        try {
            return restClient.post()
                    .uri(aiSpeakingServiceUrl + "/api/ai/speaking/scoring/evaluate/{sessionId}", sessionId)
                    .header("X-User-Id", String.valueOf(userId))
                    .retrieve()
                    .body(SpeakingResultDTO.class);
        } catch (Exception e) {
            log.error("Failed to evaluate speaking session: {}", e.getMessage());
            throw new AIGradingException("Failed to evaluate session: " + e.getMessage());
        }
    }

    public SpeakingResultDTO getResult(String sessionId) {
        try {
            return restClient.get()
                    .uri(aiSpeakingServiceUrl + "/api/ai/speaking/scoring/result/{sessionId}", sessionId)
                    .retrieve()
                    .body(SpeakingResultDTO.class);
        } catch (Exception e) {
            log.error("Failed to get speaking result: {}", e.getMessage());
            throw new AIGradingException("Failed to get result: " + e.getMessage());
        }
    }

    public Map<String, Object> getSession(String sessionId) {
        try {
            return restClient.get()
                    .uri(aiSpeakingServiceUrl + "/api/ai/speaking/sessions/{sessionId}", sessionId)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("Failed to get session: {}", e.getMessage());
            throw new AIGradingException("Failed to get session: " + e.getMessage());
        }
    }

    public Map<String, Object> endSession(String sessionId) {
        try {
            return restClient.post()
                    .uri(aiSpeakingServiceUrl + "/api/ai/speaking/sessions/{sessionId}/end", sessionId)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("Failed to end session: {}", e.getMessage());
            throw new AIGradingException("Failed to end session: " + e.getMessage());
        }
    }

    public Map<String, Object> nextPhase(String sessionId) {
        try {
            return restClient.post()
                    .uri(aiSpeakingServiceUrl + "/api/ai/speaking/sessions/{sessionId}/next-phase", sessionId)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("Failed to advance phase: {}", e.getMessage());
            throw new AIGradingException("Failed to advance phase: " + e.getMessage());
        }
    }
}
