package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.WritingSubmitRequest;
import com.victory.DAVictory.dto.WritingSubmissionResponse;
import com.victory.DAVictory.dto.WritingGradeRequest;
import com.victory.DAVictory.dto.WritingGradeHistoryResponse;
import com.victory.DAVictory.dto.AIGradingResponseDTO;
import com.victory.DAVictory.dto.AIGradingHistoryRequest;
import com.victory.DAVictory.entity.AIGradingHistory;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.repository.AIGradingHistoryRepository;
import com.victory.DAVictory.repository.TestRepository;
import com.victory.DAVictory.repository.UserRepository;
import com.victory.DAVictory.service.AIBridgeService;
import com.victory.DAVictory.service.WritingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    private final AIGradingHistoryRepository aiGradingHistoryRepository;
    private final TestRepository testRepository;
    private final UserRepository userRepository;

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

    /**
     * Test chấm bài bằng AI với essay text trực tiếp.
     * Dùng cho AITestCenter — không cần submission.
     */
    @PostMapping("/ai-grade/test")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN', 'STUDENT')")
    public ResponseEntity<?> testAiGrade(@RequestBody Map<String, String> request) {
        try {
            String essayText = request.getOrDefault("essayText", "");
            String taskType = request.getOrDefault("taskType", "TASK2_ACADEMIC");
            String topic = request.getOrDefault("topic", "");
            String chartType = request.getOrDefault("chartType", "");
            String essayType = request.getOrDefault("essayType", "");
            String letterType = request.getOrDefault("letterType", "");
            if (essayText == null || essayText.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "essayText is required"));
            }
            AIGradingResponseDTO response = aiBridgeService.testGrade(essayText, taskType, topic,
                chartType, essayType, letterType);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Lưu kết quả AI grading vào lịch sử (từ ai-test-frontend).
     */
    @PostMapping("/ai-grade/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> saveAiGradingHistory(
            @RequestBody AIGradingHistoryRequest request,
            Authentication authentication) {
        try {
            User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

            AIGradingHistory history = new AIGradingHistory();
            history.setUser(user);
            history.setEssayText(request.getEssayText());
            history.setTaskType(request.getTaskType());
            history.setTopic(request.getTopic());
            history.setPromptText(request.getPromptText());
            history.setChartType(request.getChartType());
            history.setEssayType(request.getEssayType());
            history.setLetterType(request.getLetterType());
            history.setOverallBand(request.getOverallBand());
            history.setTaskResponse(request.getTaskResponse());
            history.setCoherenceCohesion(request.getCoherenceCohesion());
            history.setLexicalResource(request.getLexicalResource());
            history.setGrammaticalRange(request.getGrammaticalRange());
            history.setOverallFeedback(request.getOverallFeedback());
            history.setStrengths(request.getStrengths() != null ? String.join("||", request.getStrengths()) : null);
            history.setWeaknesses(request.getWeaknesses() != null ? String.join("||", request.getWeaknesses()) : null);
            history.setImprovementPriority(request.getImprovementPriority() != null ? String.join("||", request.getImprovementPriority()) : null);
            history.setProvider(request.getProvider());
            history.setModel(request.getModel());
            history.setLatencyMs(request.getLatencyMs());
            history.setConfidenceScore(request.getConfidenceScore());

            aiGradingHistoryRepository.save(history);
            return ResponseEntity.ok(Map.of("id", history.getId(), "status", "saved"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Lấy lịch sử AI grading.
     * - STUDENT: chỉ xem được lịch sử của mình
     * - TEACHER/MANAGER/ADMIN: xem được tất cả, có thể lọc theo userId
     */
    @GetMapping("/ai-grade/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getAiGradingHistory(
            @RequestParam(required = false) Long userId,
            Authentication authentication) {
        try {
            User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

            boolean isPrivileged = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER")
                            || a.getAuthority().equals("ROLE_MANAGER")
                            || a.getAuthority().equals("ROLE_ADMIN"));

            List<AIGradingHistory> histories;
            if (isPrivileged) {
                if (userId != null) {
                    histories = aiGradingHistoryRepository.findByUserIdOrderByCreatedAtDesc(userId);
                } else {
                    histories = aiGradingHistoryRepository.findAllByOrderByCreatedAtDesc();
                }
            } else {
                histories = aiGradingHistoryRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
            }

            List<Map<String, Object>> result = histories.stream().map(h -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", h.getId());
                if (isPrivileged) {
                    m.put("userId", h.getUser().getId());
                    m.put("username", h.getUser().getUsername());
                    m.put("fullName", h.getUser().getFullName());
                }
                m.put("taskType", h.getTaskType());
                m.put("topic", h.getTopic());
                m.put("essayText", h.getEssayText());
                m.put("overallBand", h.getOverallBand());
                m.put("taskResponse", h.getTaskResponse());
                m.put("coherenceCohesion", h.getCoherenceCohesion());
                m.put("lexicalResource", h.getLexicalResource());
                m.put("grammaticalRange", h.getGrammaticalRange());
                m.put("overallFeedback", h.getOverallFeedback());
                m.put("strengths", h.getStrengths() != null ? List.of(h.getStrengths().split("\\|\\|")) : List.of());
                m.put("weaknesses", h.getWeaknesses() != null ? List.of(h.getWeaknesses().split("\\|\\|")) : List.of());
                m.put("improvementPriority", h.getImprovementPriority() != null ? List.of(h.getImprovementPriority().split("\\|\\|")) : List.of());
                m.put("provider", h.getProvider());
                m.put("model", h.getModel());
                m.put("createdAt", h.getCreatedAt());
                return m;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Thống kê số bài đã chấm AI từ ai_grading_history.
     * Trả về: total, thisWeek, lastWeek, percentChange
     */
    @GetMapping("/ai-grade/stats")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getAiGradingStats() {
        try {
            long total = aiGradingHistoryRepository.countTotal();

            LocalDate today = LocalDate.now();
            LocalDate thisMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate lastMonday = thisMonday.minusDays(7);

            LocalDateTime thisWeekStart = thisMonday.atStartOfDay();
            LocalDateTime thisWeekEnd = today.plusDays(1).atStartOfDay();
            LocalDateTime lastWeekStart = lastMonday.atStartOfDay();
            LocalDateTime lastWeekEnd = thisMonday.atStartOfDay();

            long thisWeek = aiGradingHistoryRepository.countByCreatedAtBetween(thisWeekStart, thisWeekEnd);
            long lastWeek = aiGradingHistoryRepository.countByCreatedAtBetween(lastWeekStart, lastWeekEnd);

            double percentChange = lastWeek > 0
                ? Math.round(((double) (thisWeek - lastWeek) / lastWeek) * 1000.0) / 10.0
                : thisWeek > 0 ? 100.0 : 0.0;

            Double avgLatency = aiGradingHistoryRepository.avgLatencyMs();
            Double avgConfidence = aiGradingHistoryRepository.avgConfidenceScore();

            Map<String, Object> stats = new HashMap<>();
            stats.put("total", total);
            stats.put("thisWeek", thisWeek);
            stats.put("lastWeek", lastWeek);
            stats.put("percentChange", percentChange);
            stats.put("trend", percentChange >= 0 ? "up" : "down");
            stats.put("avgLatencyMs", avgLatency != null ? Math.round(avgLatency * 100.0) / 100.0 : null);
            stats.put("avgConfidence", avgConfidence != null ? Math.round(avgConfidence * 1000.0) / 10.0 : null);

            return ResponseEntity.ok(stats);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Thống kê tổng quan cho trang Home.
     * Trả về: tổng đề thi, tổng bài đã chấm AI, tổng lượt sử dụng AI
     */
    @GetMapping("/ai-grade/home-stats")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getHomeStats() {
        try {
            long totalTests = testRepository.countActive();
            long totalGradings = aiGradingHistoryRepository.countTotal();
            Double avgLatency = aiGradingHistoryRepository.avgLatencyMs();
            Double avgConfidence = aiGradingHistoryRepository.avgConfidenceScore();

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalTests", totalTests);
            stats.put("totalGradings", totalGradings);
            stats.put("avgLatencyMs", avgLatency != null ? Math.round(avgLatency * 100.0) / 100.0 : null);
            stats.put("avgConfidence", avgConfidence != null ? Math.round(avgConfidence * 1000.0) / 10.0 : null);
            return ResponseEntity.ok(stats);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
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
