package com.victory.DAVictory.service;

import com.victory.DAVictory.entity.AgentAction;
import com.victory.DAVictory.entity.AgentConfig;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.repository.AgentActionRepository;
import com.victory.DAVictory.repository.AgentConfigRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AgentBridgeService {

    private final RestTemplate restTemplate;
    private final AgentConfigRepository agentConfigRepository;
    private final AgentActionRepository agentActionRepository;

    @Value("${app.ai.agent.service.url:http://localhost:5187}")
    private String agentServiceUrl;

    public AgentBridgeService(AgentConfigRepository agentConfigRepository,
                              AgentActionRepository agentActionRepository) {
        this.restTemplate = new RestTemplate();
        this.agentConfigRepository = agentConfigRepository;
        this.agentActionRepository = agentActionRepository;
    }

    public Map<String, Object> query(String message, Long userId, Long sessionId, Boolean agentMode, String mode) {
        log.info("Agent query: message={}, userId={}, sessionId={}, agentMode={}, mode={}", message, userId, sessionId, agentMode, mode);
        try {
            var body = new java.util.HashMap<String, Object>();
            body.put("message", message);
            body.put("user_id", userId != null ? userId : 0);
            if (sessionId != null) body.put("session_id", sessionId);
            body.put("agent_mode", agentMode != null && agentMode);
            if (mode != null && !mode.isBlank()) body.put("mode", mode);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            var response = restTemplate.postForObject(
                agentServiceUrl + "/api/agent/query", entity, Map.class);
            return response;
        } catch (Exception e) {
            log.error("Agent query failed: {}", e.getMessage());
            return Map.of("error", "Lỗi kết nối AI Agent: " + e.getMessage());
        }
    }

    public List<Map<String, Object>> listAgents() {
        try {
            var response = restTemplate.getForObject(
                agentServiceUrl + "/api/agent/agents", Map.class);
            if (response != null && response.containsKey("agents")) {
                return (List<Map<String, Object>>) response.get("agents");
            }
        } catch (Exception e) {
            log.error("Failed to list agents: {}", e.getMessage());
        }
        return List.of();
    }

    public Map<String, Object> getSessionProgress(Long sessionId) {
        try {
            var response = restTemplate.getForObject(
                agentServiceUrl + "/api/agent/sessions/{sessionId}/progress",
                Map.class, sessionId);
            return response;
        } catch (Exception e) {
            return Map.of("session_id", sessionId, "progress", Map.of());
        }
    }

    public List<Map<String, Object>> getSessionTasks(Long sessionId) {
        try {
            var response = restTemplate.getForObject(
                agentServiceUrl + "/api/agent/sessions/{sessionId}/tasks",
                Map.class, sessionId);
            if (response != null && response.containsKey("tasks")) {
                return (List<Map<String, Object>>) response.get("tasks");
            }
        } catch (Exception e) {
            log.error("Failed to get tasks: {}", e.getMessage());
        }
        return List.of();
    }

    public StreamingResponseBody streamSessionResults(Long sessionId) {
        return outputStream -> {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            var url = agentServiceUrl + "/api/agent/sessions/" + sessionId + "/stream";
            var request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "text/event-stream")
                    .timeout(Duration.ofMinutes(5))
                    .GET()
                    .build();

            try {
                var response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
                try (InputStream body = response.body()) {
                    byte[] buffer = new byte[4096];
                    int bytesRead;
                    while ((bytesRead = body.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                        outputStream.flush();
                    }
                }
            } catch (Exception e) {
                log.error("SSE stream failed for session {}: {}", sessionId, e.getMessage());
                try {
                    outputStream.write(("data: {\"type\":\"error\",\"data\":{\"error\":\"" + e.getMessage() + "\"}}\n\n").getBytes());
                    outputStream.flush();
                } catch (Exception ignored) {}
            }
        };
    }

    // ===== Uploads proxy =====

    public ResponseEntity<Resource> proxyUpload(String requestUri) {
        try {
            String path = requestUri.startsWith("/uploads/") ? requestUri : requestUri.replaceFirst("/api/agent", "");
            String url = agentServiceUrl + path;
            var resp = restTemplate.exchange(url, HttpMethod.GET, null, byte[].class);
            var headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                resp.getHeaders().getContentType() != null
                    ? resp.getHeaders().getContentType().toString()
                    : "application/octet-stream"
            ));
            headers.setCacheControl("public, max-age=86400");
            return ResponseEntity.ok()
                .headers(headers)
                .body(new ByteArrayResource(resp.getBody()));
        } catch (Exception e) {
            log.error("proxyUpload failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    public ResponseEntity<byte[]> proxyGeneric(Map<String, Object> body, String path) {
        return proxyGeneric(body, path, HttpMethod.POST);
    }

    public ResponseEntity<byte[]> proxyGeneric(Map<String, Object> body, String path, HttpMethod method) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            var resp = restTemplate.exchange(
                agentServiceUrl + path,
                method,
                entity,
                byte[].class
            );
            var respHeaders = new HttpHeaders();
            respHeaders.setContentType(
                resp.getHeaders().getContentType() != null
                    ? resp.getHeaders().getContentType()
                    : MediaType.APPLICATION_OCTET_STREAM
            );
            if (resp.getHeaders().getContentDisposition() != null) {
                respHeaders.setContentDisposition(resp.getHeaders().getContentDisposition());
            }
            return ResponseEntity.status(resp.getStatusCode()).headers(respHeaders).body(resp.getBody());
        } catch (Exception e) {
            log.error("proxyGeneric failed for {}: {}", path, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    public ResponseEntity<byte[]> proxyGet(String path) {
        try {
            var resp = restTemplate.getForEntity(agentServiceUrl + path, byte[].class);
            var respHeaders = new HttpHeaders();
            respHeaders.setContentType(
                resp.getHeaders().getContentType() != null
                    ? resp.getHeaders().getContentType()
                    : MediaType.APPLICATION_JSON
            );
            return ResponseEntity.status(resp.getStatusCode()).headers(respHeaders).body(resp.getBody());
        } catch (Exception e) {
            log.error("proxyGet failed for {}: {}", path, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    // ===== Blog Wizard =====

    public Map<String, Object> startWizard(String topic) {
        try {
            var body = new java.util.HashMap<String, Object>();
            body.put("topic", topic);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            return restTemplate.postForObject(
                agentServiceUrl + "/api/agent/posts/generate", entity, Map.class);
        } catch (Exception e) {
            log.error("startWizard failed: {}", e.getMessage());
            return Map.of("error", "Lỗi kết nối AI Agent: " + e.getMessage());
        }
    }

    public Map<String, Object> getWizardStatus(String taskId) {
        try {
            return restTemplate.getForObject(
                agentServiceUrl + "/api/agent/posts/generate/{taskId}",
                Map.class, taskId);
        } catch (Exception e) {
            log.error("getWizardStatus failed: {}", e.getMessage());
            return Map.of("error", "Lỗi kết nối AI Agent: " + e.getMessage());
        }
    }

    public Map<String, Object> confirmWizardOutline(String taskId, Map<String, Object> body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            return restTemplate.postForObject(
                agentServiceUrl + "/api/agent/posts/generate/{taskId}/outline",
                entity, Map.class, taskId);
        } catch (Exception e) {
            log.error("confirmWizardOutline failed: {}", e.getMessage());
            return Map.of("error", "Lỗi kết nối AI Agent: " + e.getMessage());
        }
    }

    public Map<String, Object> confirmWizardContent(String taskId, Map<String, Object> body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            return restTemplate.postForObject(
                agentServiceUrl + "/api/agent/posts/generate/{taskId}/content",
                entity, Map.class, taskId);
        } catch (Exception e) {
            log.error("confirmWizardContent failed: {}", e.getMessage());
            return Map.of("error", "Lỗi kết nối AI Agent: " + e.getMessage());
        }
    }

    public Map<String, Object> improveWizardOutline(String taskId, String feedback) {
        try {
            var body = new java.util.HashMap<String, Object>();
            body.put("feedback", feedback);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            return restTemplate.postForObject(
                agentServiceUrl + "/api/agent/posts/generate/{taskId}/outline/improve",
                entity, Map.class, taskId);
        } catch (Exception e) {
            log.error("improveWizardOutline failed: {}", e.getMessage());
            return Map.of("error", "Lỗi kết nối AI Agent: " + e.getMessage());
        }
    }

    // ===== Agent Config =====

    public List<AgentConfig> getAllConfigs() {
        return agentConfigRepository.findAll();
    }

    public AgentConfig updateConfig(Long id, String model, Double temperature, String systemPrompt, Boolean isActive) {
        AgentConfig config = agentConfigRepository.findById(id).orElse(null);
        if (config == null) return null;
        if (model != null) config.setModel(model);
        if (temperature != null) config.setTemperature(temperature);
        if (systemPrompt != null) config.setSystemPrompt(systemPrompt);
        if (isActive != null) config.setIsActive(isActive);
        return agentConfigRepository.save(config);
    }

    // ===== Agent Actions (Human-in-the-loop) =====

    public List<AgentAction> getPendingActions() {
        return agentActionRepository.findByStatusOrderByCreatedAtDesc("pending");
    }

    public AgentAction approveAction(Long id, String reason, User approver) {
        AgentAction action = agentActionRepository.findById(id).orElse(null);
        if (action == null) return null;
        action.setStatus("approved");
        action.setReason(reason);
        action.setApprovedBy(approver);
        action.setResolvedAt(LocalDateTime.now());
        return agentActionRepository.save(action);
    }

    public AgentAction rejectAction(Long id, String reason, User approver) {
        AgentAction action = agentActionRepository.findById(id).orElse(null);
        if (action == null) return null;
        action.setStatus("rejected");
        action.setReason(reason);
        action.setApprovedBy(approver);
        action.setResolvedAt(LocalDateTime.now());
        return agentActionRepository.save(action);
    }
}
