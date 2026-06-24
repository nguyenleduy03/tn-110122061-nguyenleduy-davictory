package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.SpeakingResultDTO;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.repository.UserRepository;
import com.victory.DAVictory.service.AISpeakingBridgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/ai/speaking/test")
@RequiredArgsConstructor
public class AISpeakingTestController {

    private final AISpeakingBridgeService bridgeService;
    private final UserRepository userRepository;

    private Long getUserId(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return 0L;
        return userRepository.findByUsername(auth.getName())
            .map(User::getId)
            .orElse(0L);
    }

    private String getRole(Authentication auth) {
        return auth.getAuthorities().stream()
            .map(g -> g.getAuthority().replace("ROLE_", ""))
            .findFirst()
            .orElse("STUDENT");
    }

    @PostMapping("/session")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createSession(@RequestBody Map<String, Object> request, Authentication auth) {
        try {
            Long userId = getUserId(auth);
            String userName = auth.getName();
            String userRole = getRole(auth);
            Map<String, Object> result = bridgeService.createSession(null, userId, userName, userRole, request);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{sessionId}/question")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> generateQuestion(@PathVariable String sessionId) {
        try {
            Map<String, Object> result = bridgeService.generateQuestion(sessionId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{sessionId}/answer")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> submitAnswer(@PathVariable String sessionId, @RequestBody Map<String, Object> request) {
        try {
            String answerText = (String) request.getOrDefault("answerText", "");
            Integer durationMs = (Integer) request.getOrDefault("durationMs", 0);
            Map<String, Object> result = bridgeService.submitAnswer(sessionId, answerText, durationMs);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{sessionId}/audio")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> uploadAudio(@PathVariable String sessionId, @RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> result = bridgeService.uploadAudio(sessionId, file);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{sessionId}/evaluate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> evaluateSession(@PathVariable String sessionId, Authentication auth) {
        try {
            Long userId = getUserId(auth);
            SpeakingResultDTO result = bridgeService.evaluateSession(sessionId, userId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{sessionId}/result")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getResult(@PathVariable String sessionId) {
        try {
            SpeakingResultDTO result = bridgeService.getResult(sessionId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.ok(Map.of("sessionId", sessionId, "status", "NOT_EVALUATED"));
        }
    }

    @GetMapping("/{sessionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getSession(@PathVariable String sessionId) {
        try {
            Map<String, Object> result = bridgeService.getSession(sessionId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{sessionId}/next-phase")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> nextPhase(@PathVariable String sessionId) {
        try {
            Map<String, Object> result = bridgeService.nextPhase(sessionId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
