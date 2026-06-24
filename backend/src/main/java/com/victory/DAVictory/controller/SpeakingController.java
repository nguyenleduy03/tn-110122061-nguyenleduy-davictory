package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.SpeakingAttemptResponse;
import com.victory.DAVictory.dto.SpeakingGradeRequest;
import com.victory.DAVictory.service.SpeakingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/speaking")
@RequiredArgsConstructor
public class SpeakingController {

    private final SpeakingService speakingService;

    /**
     * Xem chi tiết bài nói (kèm recordings, transcript).
     */
    @GetMapping("/attempts/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getAttemptDetail(
            @PathVariable Long attemptId,
            Authentication authentication) {
        try {
            String teacherUsername = authentication.getName();
            SpeakingAttemptResponse response = speakingService.getAttemptDetail(attemptId, teacherUsername);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Chấm bài Speaking.
     */
    @PostMapping("/grade/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> gradeSpeaking(
            @PathVariable Long attemptId,
            @RequestBody SpeakingGradeRequest request,
            Authentication authentication) {
        try {
            String teacherUsername = authentication.getName();
            speakingService.gradeSpeaking(attemptId, teacherUsername, request);
            return ResponseEntity.ok(Map.of("message", "Graded successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
