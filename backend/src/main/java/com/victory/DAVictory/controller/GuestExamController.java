package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.GuestExamResponse;
import com.victory.DAVictory.dto.GuestExamStartRequest;
import com.victory.DAVictory.dto.GuestExamSubmitRequest;
import com.victory.DAVictory.service.GuestExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/guest/exam-attempts")
@RequiredArgsConstructor
public class GuestExamController {

    private final GuestExamService guestExamService;

    @PostMapping("/start")
    public ResponseEntity<?> startGuestAttempt(@RequestBody GuestExamStartRequest request) {
        try {
            GuestExamResponse response = guestExamService.startGuestAttempt(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{attemptId}/submit")
    public ResponseEntity<?> submitGuestAttempt(@PathVariable Long attemptId,
                                                 @RequestBody GuestExamSubmitRequest request) {
        try {
            GuestExamResponse response = guestExamService.submitGuestAttempt(attemptId, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{attemptId}")
    public ResponseEntity<?> getGuestAttempt(@PathVariable Long attemptId) {
        try {
            // Simple lookup without authentication
            return ResponseEntity.ok(Map.of("message", "Guest attempt details"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
