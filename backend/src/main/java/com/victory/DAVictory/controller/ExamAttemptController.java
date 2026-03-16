package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.ExamAttemptResponse;
import com.victory.DAVictory.dto.ExamAttemptStartRequest;
import com.victory.DAVictory.dto.ExamAttemptSubmitRequest;
import com.victory.DAVictory.service.ExamAttemptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exam-attempts")
@RequiredArgsConstructor
public class ExamAttemptController {

    private final ExamAttemptService examAttemptService;

    @PostMapping("/start")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> startAttempt(@RequestBody ExamAttemptStartRequest request,
                                          Authentication authentication) {
        try {
            String username = authentication.getName();
            ExamAttemptResponse response = examAttemptService.startAttempt(username, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{attemptId}/submit")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> submitAttempt(@PathVariable Long attemptId,
                                           @RequestBody ExamAttemptSubmitRequest request,
                                           Authentication authentication) {
        try {
            String username = authentication.getName();
            ExamAttemptResponse response = examAttemptService.submitAttempt(username, attemptId, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getMyAttempts(Authentication authentication) {
        try {
            String username = authentication.getName();
            List<ExamAttemptResponse> list = examAttemptService.getMyAttempts(username);
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getAttempt(@PathVariable Long id, Authentication authentication) {
        try {
            String username = authentication.getName();
            ExamAttemptResponse response = examAttemptService.getAttempt(id, username);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getAllAttempts() {
        try {
            List<ExamAttemptResponse> list = examAttemptService.getAllAttempts();
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
