package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.AIGradingResponseDTO;
import com.victory.DAVictory.dto.AIBatchGradingRequestDTO;
import com.victory.DAVictory.dto.AIBatchGradingStatusDTO;
import com.victory.DAVictory.exception.AIGradingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AIBridgeService {

    private final RestClient restClient;

    @Value("${app.ai.service.url:http://localhost:5180}")
    private String aiServiceUrl;

    public AIBridgeService() {
        this.restClient = RestClient.builder()
            .requestFactory(new JdkClientHttpRequestFactory())
            .build();
    }

    public AIGradingResponseDTO gradeWriting(Long submissionId, String userId, String role) {
        log.info("Calling AI service to grade submission {} for user {}", submissionId, userId);

        try {
            var response = restClient.post()
                .uri(aiServiceUrl + "/api/ai/writing/grade/{submissionId}", submissionId)
                .header("X-User-Id", userId)
                .header("X-User-Role", role)
                .retrieve()
                .body(AIGradingResponseDTO.class);

            log.info("AI grading completed for submission {}", submissionId);
            return response;

        } catch (Exception e) {
            log.error("AI grading failed for submission {}: {}", submissionId, e.getMessage());
            throw new AIGradingException("AI grading failed: " + e.getMessage());
        }
    }

    public Map<String, Object> gradeBatch(List<Long> submissionIds, String userId) {
        var request = new AIBatchGradingRequestDTO();
        request.setSubmissionIds(submissionIds);

        var response = restClient.post()
            .uri(aiServiceUrl + "/api/ai/writing/batch")
            .header("X-User-Id", userId)
            .body(request)
            .retrieve()
            .body(Map.class);

        return response;
    }

    public AIGradingResponseDTO getResult(Long submissionId) {
        return restClient.get()
            .uri(aiServiceUrl + "/api/ai/writing/result/{submissionId}", submissionId)
            .retrieve()
            .body(AIGradingResponseDTO.class);
    }
}
