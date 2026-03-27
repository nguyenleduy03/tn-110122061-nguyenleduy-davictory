package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.*;
import com.victory.DAVictory.service.TestAttemptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/test-attempts")
@RequiredArgsConstructor
public class TestAttemptController {

    private final TestAttemptService testAttemptService;

    /**
     * POST /api/test-attempts/start
     * Bắt đầu bài thi mới (full test, single skill, hoặc practice)
     */
    @PostMapping("/start")
    public ResponseEntity<?> startTest(
            Authentication auth,
            @RequestBody TestAttemptRequest request) {
        try {
            String username = auth.getName();
            TestAttemptResponse response = testAttemptService.startTest(username, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/test-attempts/save-answers
     * Lưu câu trả lời (tạm thời hoặc nộp bài cuối cùng)
     */
    @PostMapping("/save-answers")
    public ResponseEntity<?> saveAnswers(
            Authentication auth,
            @RequestBody SubmitAnswersRequest request) {
        try {
            String username = auth.getName();
            TestAttemptResponse response = testAttemptService.saveAnswers(username, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/test-attempts/{attemptId}/result
     * Lấy kết quả chi tiết sau khi hoàn thành
     */
    @GetMapping("/{attemptId}/result")
    public ResponseEntity<?> getTestResult(
            Authentication auth,
            @PathVariable Long attemptId) {
        try {
            String username = auth.getName();
            TestResultResponse response = testAttemptService.getTestResult(username, attemptId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/test-attempts/{attemptId}
     * Lấy thông tin attempt đang làm
     */
    @GetMapping("/{attemptId}")
    public ResponseEntity<?> getAttempt(
            Authentication auth,
            @PathVariable Long attemptId) {
        try {
            String username = auth.getName();
            // Reuse existing service method
            return ResponseEntity.ok(Map.of("message", "Use /result endpoint for completed attempts"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
