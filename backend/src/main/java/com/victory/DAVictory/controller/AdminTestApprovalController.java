package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.Test;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.repository.TestRepository;
import com.victory.DAVictory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/test-approval")
@RequiredArgsConstructor
public class AdminTestApprovalController {

    private final TestRepository testRepo;
    private final UserRepository userRepo;

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getPendingTests() {
        try {
            List<Test> pending = testRepo.findByStatus(TestStatus.REVIEWING);
            List<Map<String, Object>> result = pending.stream().map(t -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", t.getId());
                m.put("title", t.getTitle());
                m.put("testType", t.getTestType());
                m.put("isFullTest", t.getIsFullTest());
                m.put("durationMinutes", t.getDurationMinutes());
                m.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);
                m.put("createdBy", t.getCreatedBy() != null ? Map.of(
                        "id", t.getCreatedBy().getId(),
                        "fullName", t.getCreatedBy().getFullName(),
                        "username", t.getCreatedBy().getUsername(),
                        "email", t.getCreatedBy().getEmail()
                ) : null);
                return m;
            }).collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{testId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveTest(@PathVariable Long testId, Authentication auth) {
        try {
            Test test = testRepo.findById(testId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi"));
            if (test.getStatus() != TestStatus.REVIEWING) {
                return ResponseEntity.badRequest().body(Map.of("error", "Đề thi không ở trạng thái chờ duyệt"));
            }
            User admin = userRepo.findByUsername(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy admin"));
            test.setStatus(TestStatus.PUBLISHED);
            test.setReviewedBy(admin);
            test.setReviewedAt(LocalDateTime.now());
            test.setPublishedAt(LocalDateTime.now());
            testRepo.save(test);
            return ResponseEntity.ok(Map.of("message", "Đề thi đã được phê duyệt", "id", testId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{testId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectTest(@PathVariable Long testId, @RequestBody(required = false) Map<String, String> body) {
        try {
            Test test = testRepo.findById(testId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi"));
            if (test.getStatus() != TestStatus.REVIEWING) {
                return ResponseEntity.badRequest().body(Map.of("error", "Đề thi không ở trạng thái chờ duyệt"));
            }
            test.setStatus(TestStatus.DRAFT);
            testRepo.save(test);
            String reason = body != null ? body.getOrDefault("reason", "") : "";
            return ResponseEntity.ok(Map.of("message", "Đề thi đã được trả về", "reason", reason, "id", testId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
