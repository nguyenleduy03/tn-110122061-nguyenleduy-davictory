package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.WritingSubmitRequest;
import com.victory.DAVictory.dto.WritingSubmissionResponse;
import com.victory.DAVictory.dto.WritingGradeRequest;
import com.victory.DAVictory.dto.WritingGradeHistoryResponse;
import com.victory.DAVictory.dto.AIGradingResponseDTO;
import com.victory.DAVictory.service.AIBridgeService;
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
    private final AIBridgeService aiBridgeService;

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

    /**
     * Lấy danh sách bài nộp của học viên trong các lớp mà giáo viên dạy.
     */
    @GetMapping("/teacher/submissions")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getSubmissionsForTeacher(Authentication authentication) {
        try {
            String teacherUsername = authentication.getName();
            List<WritingSubmissionResponse> list = writingService.getSubmissionsForTeacher(teacherUsername);
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Lấy chi tiết bài viết cho giáo viên.
     */
    @GetMapping("/teacher/submissions/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getSubmissionForTeacher(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            String teacherUsername = authentication.getName();
            WritingSubmissionResponse response = writingService.getSubmissionForTeacher(id, teacherUsername);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Lấy tất cả bài làm (exam attempts) của học viên trong các lớp mà giáo viên dạy.
     */
    @GetMapping("/teacher/all-submissions")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getAllSubmissionsForTeacher(Authentication authentication) {
        try {
            String teacherUsername = authentication.getName();
            Map<String, Object> result = writingService.getAllSubmissionsForTeacher(teacherUsername);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Chấm bài Writing.
     */
    @PostMapping("/grade/{submissionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> gradeWriting(
            @PathVariable Long submissionId,
            @RequestBody WritingGradeRequest request,
            Authentication authentication) {
        try {
            String teacherUsername = authentication.getName();
            WritingSubmissionResponse response = writingService.gradeWriting(submissionId, teacherUsername, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Chấm bài Writing bằng AI.
     * Gọi AI Writing Service (port 8081) để chấm tự động.
     */
    @PostMapping("/ai-grade/{submissionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> aiGradeWriting(
            @PathVariable Long submissionId,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            AIGradingResponseDTO response = aiBridgeService.gradeWriting(
                submissionId, username, getRole(authentication));
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Xem kết quả chấm AI của một bài viết.
     */
    @GetMapping("/ai-grade/{submissionId}/result")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN', 'STUDENT')")
    public ResponseEntity<?> getAiGradingResult(
            @PathVariable Long submissionId) {
        try {
            AIGradingResponseDTO response = aiBridgeService.getResult(submissionId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.ok(Map.of(
                "submissionId", submissionId,
                "status", "NOT_GRADED"));
        }
    }

    private String getRole(Authentication auth) {
        return auth.getAuthorities().stream()
            .map(g -> g.getAuthority().replace("ROLE_", ""))
            .findFirst()
            .orElse("STUDENT");
    }

    /**
     * Lịch sử chấm bài Writing theo từng lần chỉnh sửa.
     */
    @GetMapping("/grade/{submissionId}/history")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getWritingGradeHistory(
            @PathVariable Long submissionId,
            Authentication authentication) {
        try {
            String teacherUsername = authentication.getName();
            List<WritingGradeHistoryResponse> list = writingService.getWritingGradeHistory(submissionId, teacherUsername);
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
