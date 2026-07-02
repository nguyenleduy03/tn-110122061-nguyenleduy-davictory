package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.*;
import com.victory.DAVictory.entity.AgentAction;
import com.victory.DAVictory.entity.AgentConfig;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.repository.UserRepository;
import com.victory.DAVictory.service.AgentBridgeService;
import com.victory.DAVictory.service.BlogPostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
public class AgentController {

    private final AgentBridgeService agentBridgeService;
    private final BlogPostService blogPostService;
    private final UserRepository userRepository;

    private Long getUserId(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return 0L;
        return userRepository.findByUsername(auth.getName())
            .map(User::getId)
            .orElse(0L);
    }

    @PostMapping("/query")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> query(@RequestBody AgentChatRequest request, Authentication auth) {
        Long userId = getUserId(auth);
        var result = agentBridgeService.query(request.getMessage(), userId, request.getSession_id(), request.getAgent_mode(), request.getMode());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/agents")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> listAgents() {
        var agents = agentBridgeService.listAgents();
        return ResponseEntity.ok(Map.of("agents", agents));
    }

    @GetMapping("/sessions/{sessionId}/tasks")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> getSessionTasks(@PathVariable Long sessionId) {
        var tasks = agentBridgeService.getSessionTasks(sessionId);
        return ResponseEntity.ok(Map.of("tasks", tasks));
    }

    @GetMapping("/sessions/{sessionId}/progress")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> getProgress(@PathVariable Long sessionId) {
        var progress = agentBridgeService.getSessionProgress(sessionId);
        return ResponseEntity.ok(progress);
    }

    @GetMapping("/sessions/{sessionId}/stream")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<StreamingResponseBody> streamSession(@PathVariable Long sessionId) {
        StreamingResponseBody stream = agentBridgeService.streamSessionResults(sessionId);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(stream);
    }

    // ===== Uploads proxy → Python AI Agent =====

    // ===== Blog Wizard (proxied to Python) =====

    @PostMapping("/posts/generate")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> startWizard(@RequestBody Map<String, String> body) {
        var result = agentBridgeService.startWizard(body.get("topic"));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/posts/generate/{taskId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getWizardStatus(@PathVariable String taskId) {
        var result = agentBridgeService.getWizardStatus(taskId);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/posts/generate/{taskId}/outline")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> confirmWizardOutline(@PathVariable String taskId, @RequestBody Map<String, Object> body) {
        var result = agentBridgeService.confirmWizardOutline(taskId, body);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/posts/generate/{taskId}/content")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> confirmWizardContent(@PathVariable String taskId, @RequestBody Map<String, Object> body) {
        var result = agentBridgeService.confirmWizardContent(taskId, body);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/posts/generate/{taskId}/outline/improve")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> improveWizardOutline(@PathVariable String taskId, @RequestBody Map<String, String> body) {
        var result = agentBridgeService.improveWizardOutline(taskId, body.get("feedback"));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/posts")
    public ResponseEntity<?> listPosts(@RequestParam(required = false) String status) {
        List<BlogPostListResponse> posts = blogPostService.listPosts(status);
        return ResponseEntity.ok(Map.of("posts", posts));
    }

    @GetMapping("/posts/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getPost(@PathVariable Long id) {
        BlogPostResponse post = blogPostService.getPost(id);
        if (post == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(post);
    }

    @DeleteMapping("/posts/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> deletePost(@PathVariable Long id) {
        blogPostService.deletePost(id);
        return ResponseEntity.ok(Map.of("message", "Deleted post " + id));
    }

    @PutMapping("/posts/{id}/publish")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> publishPost(@PathVariable Long id) {
        BlogPostResponse post = blogPostService.publishPost(id);
        if (post == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(post);
    }

    @GetMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getConfig() {
        List<AgentConfig> configs = agentBridgeService.getAllConfigs();
        return ResponseEntity.ok(configs);
    }

    @PutMapping("/config/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateConfig(@PathVariable Long id, @RequestBody AgentConfigRequest request) {
        AgentConfig config = agentBridgeService.updateConfig(
            id, request.getModel(), request.getTemperature(),
            request.getSystemPrompt(), request.getIsActive()
        );
        if (config == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(config);
    }

    @GetMapping("/actions/pending")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> getPendingActions() {
        List<AgentAction> actions = agentBridgeService.getPendingActions();
        return ResponseEntity.ok(actions);
    }

    @PostMapping("/actions/{id}/approve")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> approveAction(@PathVariable Long id, @RequestBody AgentActionRequest request, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();
        AgentAction action = agentBridgeService.approveAction(id, request.getReason(), user);
        if (action == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(action);
    }

    @PostMapping("/actions/{id}/reject")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> rejectAction(@PathVariable Long id, @RequestBody AgentActionRequest request, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();
        AgentAction action = agentBridgeService.rejectAction(id, request.getReason(), user);
        if (action == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(action);
    }

    // ===== Report Export (proxied to Python) =====

    @PostMapping("/report/export-pdf")
    public ResponseEntity<?> exportReportPdf(@RequestBody Map<String, Object> body) {
        return agentBridgeService.proxyGeneric(body, "/api/agent/report/export-pdf");
    }

    // ===== Categories (proxied to Python) =====

    @GetMapping("/posts-list")
    public ResponseEntity<?> listPostsPython() {
        return agentBridgeService.proxyGet("/api/agent/posts-list");
    }

    @GetMapping("/categories")
    public ResponseEntity<?> listCategories() {
        return agentBridgeService.proxyGet("/api/agent/categories");
    }

    @PostMapping("/categories")
    public ResponseEntity<?> createCategory(@RequestBody Map<String, Object> body) {
        return agentBridgeService.proxyGeneric(body, "/api/agent/categories");
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        body.put("_id", id);
        return agentBridgeService.proxyGeneric(body, "/api/agent/categories/" + id);
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id) {
        return agentBridgeService.proxyGeneric(Map.of("_id", id), "/api/agent/categories/" + id);
    }

    @PutMapping("/posts/{postId}/category")
    public ResponseEntity<?> assignCategory(@PathVariable Long postId, @RequestBody Map<String, Object> body) {
        return agentBridgeService.proxyGeneric(body, "/api/agent/posts/" + postId + "/category", HttpMethod.PUT);
    }

    @GetMapping("/posts/{postId}/category")
    public ResponseEntity<?> getPostCategory(@PathVariable Long postId) {
        return agentBridgeService.proxyGet("/api/agent/posts/" + postId + "/category");
    }
}
