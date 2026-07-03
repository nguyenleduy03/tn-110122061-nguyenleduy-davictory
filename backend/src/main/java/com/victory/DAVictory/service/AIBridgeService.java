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

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AIBridgeService {

    private final RestClient restClient;

    @Value("${app.ai.service.url:http://localhost:5182}")
    private String aiServiceUrl;

    @Value("${app.ai.import.service.url:http://localhost:5186}")
    private String aiImportServiceUrl;

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
                .header("X-Chart-Type", "")
                .header("X-Essay-Type", "")
                .header("X-Letter-Type", "")
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

    public AIGradingResponseDTO testGrade(String essayText, String taskType, String topic,
                                           String chartType, String essayType, String letterType) {
        log.info("Test grading essay ({} chars)", essayText.length());
        try {
            Map<String, String> body = new java.util.HashMap<>();
            body.put("essayText", essayText);
            body.put("taskType", taskType != null ? taskType : "TASK2_ACADEMIC");
            body.put("topic", topic != null ? topic : "");
            body.put("chartType", chartType != null ? chartType : "");
            body.put("essayType", essayType != null ? essayType : "");
            body.put("letterType", letterType != null ? letterType : "");
            var response = restClient.post()
                .uri(aiServiceUrl + "/api/ai/writing/test-grade")
                .body(body)
                .retrieve()
                .body(AIGradingResponseDTO.class);
            log.info("Test grading completed");
            return response;
        } catch (Exception e) {
            log.error("Test grading failed: {}", e.getMessage());
            throw new AIGradingException("AI grading failed: " + e.getMessage());
        }
    }

    // ==================== AI Import Service ====================

    public Map<String, Object> importParseDocument(byte[] content, String filename,
                                                    String skillHint, String testType) {
        log.info("AI import parse: {} ({} bytes)", filename, content.length);
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(content) {
                @Override
                public String getFilename() { return filename; }
            });
            body.add("skillHint", skillHint != null ? skillHint : "");
            body.add("testType", testType != null ? testType : "ACADEMIC");

            var response = restClient.post()
                .uri(aiImportServiceUrl + "/api/ai/import/parse")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(Map.class);
            return response;
        } catch (Exception e) {
            log.error("AI import parse failed: {}", e.getMessage());
            throw new AIGradingException("Import parse failed: " + e.getMessage());
        }
    }

    public Map<String, Object> importCreateTest(Map<String, Object> request) {
        log.info("AI import create test: {}", request.getOrDefault("title", "Untitled"));
        try {
            var response = restClient.post()
                .uri(aiImportServiceUrl + "/api/ai/import/create")
                .body(request)
                .retrieve()
                .body(Map.class);
            return response;
        } catch (Exception e) {
            log.error("AI import create failed: {}", e.getMessage());
            throw new AIGradingException("Import create failed: " + e.getMessage());
        }
    }

    public Map<String, Object> importGetStatus(String taskId) {
        try {
            var response = restClient.get()
                .uri(aiImportServiceUrl + "/api/ai/import/status/{taskId}", taskId)
                .retrieve()
                .body(Map.class);
            return response;
        } catch (Exception e) {
            return Map.of("taskId", taskId, "status", "UNKNOWN");
        }
    }

    public Map<String, Object> importVisionExtract(byte[] content, String filename,
                                                     String questionType, String skillHint,
                                                     String testType, String part) {
        log.info("AI import vision extract: {} ({} bytes), qtype={}", filename, content.length, questionType);
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(content) {
                @Override
                public String getFilename() { return filename; }
            });
            body.add("question_type", questionType != null ? questionType : "");
            body.add("skill_hint", skillHint != null ? skillHint : "");
            body.add("test_type", testType != null ? testType : "ACADEMIC");
            body.add("part", part != null ? part : "");

            var response = restClient.post()
                .uri(aiImportServiceUrl + "/api/ai/import/vision-extract")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(Map.class);
            return response;
        } catch (Exception e) {
            log.error("AI import vision extract failed: {}", e.getMessage());
            throw new AIGradingException("Vision extract failed: " + e.getMessage());
        }
    }

    public Map<String, Object> importFormatStructure(Map<String, Object> request) {
        log.info("AI import format structure: qtype={}", request.getOrDefault("question_type", "?"));
        try {
            var response = restClient.post()
                .uri(aiImportServiceUrl + "/api/ai/import/format-structure")
                .body(request)
                .retrieve()
                .body(Map.class);
            return response;
        } catch (Exception e) {
            log.error("AI import format structure failed: {}", e.getMessage());
            throw new AIGradingException("Format structure failed: " + e.getMessage());
        }
    }
}
