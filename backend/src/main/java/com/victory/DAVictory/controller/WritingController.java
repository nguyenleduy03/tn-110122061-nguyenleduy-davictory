package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.WritingSubmitRequest;
import com.victory.DAVictory.dto.WritingSubmissionResponse;
import com.victory.DAVictory.service.WritingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * WritingController — quản lý bài nộp writing của học viên.
 *
 * POST /api/writing/submit           — nộp bài writing
 * GET  /api/writing/submissions      — xem danh sách bài của mình
 * GET  /api/writing/submissions/{id} — xem chi tiết một bài
 */
@RestController
@RequestMapping("/api/writing")
@RequiredArgsConstructor
public class WritingController {

    private final WritingService writingService;

    /**
     * Nộp bài viết writing.
     * Yêu cầu: đã đăng nhập (bất kỳ role nào).
     */
    @PostMapping("/submit")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> submitWriting(
            @RequestBody WritingSubmitRequest request,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            WritingSubmissionResponse response = writingService.submitWriting(username, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Lấy danh sách bài writing đã nộp của học viên đang đăng nhập.
     */
    @GetMapping("/submissions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMySubmissions(Authentication authentication) {
        try {
            String username = authentication.getName();
            List<WritingSubmissionResponse> list = writingService.getMySubmissions(username);
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Xem chi tiết một bài viết (chỉ của chính mình).
     */
    @GetMapping("/submissions/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getSubmission(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            WritingSubmissionResponse response = writingService.getSubmission(id, username);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
