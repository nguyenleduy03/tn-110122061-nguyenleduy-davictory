package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.Test;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.service.TestManagementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tests")
public class TestController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private TestManagementService testManagementService;

    @GetMapping("/debug")
    public ResponseEntity<?> debugInfo() {
        return ResponseEntity.ok(Map.of(
            "message", "API is working",
            "timestamp", System.currentTimeMillis(),
            "endpoint", "/api/tests/debug"
        ));
    }

    @PutMapping("/{testId}/status")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> updateTestStatus(
            @PathVariable Long testId,
            @RequestParam String status,
            Authentication authentication) {
        try {
            TestStatus newStatus = TestStatus.valueOf(status.toUpperCase());
            String currentUsername = authentication != null ? authentication.getName() : null;
            boolean isAdmin = hasRole(authentication, "ADMIN");
            Test updatedTest = testManagementService.updateTestStatus(testId, newStatus, null, currentUsername, isAdmin);
            
            // Trả về Map thay vì entity để tránh infinite recursion
            return ResponseEntity.ok(Map.of(
                "id", updatedTest.getId(),
                "title", updatedTest.getTitle(),
                "status", updatedTest.getStatus().toString(),
                "updatedAt", updatedTest.getUpdatedAt(),
                "publishedAt", updatedTest.getPublishedAt() != null ? updatedTest.getPublishedAt() : ""
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Trạng thái không hợp lệ: " + status));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Không thể cập nhật trạng thái: " + e.getMessage()));
        }
    }

    @PutMapping("/{testId}/restore")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> restoreTest(
            @PathVariable Long testId,
            Authentication authentication) {
        try {
            String currentUsername = authentication != null ? authentication.getName() : null;
            boolean isAdmin = hasRole(authentication, "ADMIN");
            Test restoredTest = testManagementService.restoreTest(testId, currentUsername, isAdmin);

            return ResponseEntity.ok(Map.of(
                "id", restoredTest.getId(),
                "title", restoredTest.getTitle(),
                "status", restoredTest.getStatus().toString(),
                "updatedAt", restoredTest.getUpdatedAt(),
                "publishedAt", restoredTest.getPublishedAt() != null ? restoredTest.getPublishedAt() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/published")
    public ResponseEntity<?> getPublishedTests(@RequestParam(required = false) String testType) {
        try {
            // Query tối ưu với JOIN để giảm số lần query
            String sql = "SELECT DISTINCT t.id, t.title, t.description, t.test_type, t.duration_minutes, " +
                        "t.target_band, t.attempt_count, t.average_score, t.published_at, t.created_at, " +
                        "t.status, t.is_full_test " +
                        "FROM tests t WHERE t.status = 'PUBLISHED'";
            
            if (testType != null && !testType.isBlank()) {
                sql += " AND t.test_type = ? ORDER BY t.published_at DESC LIMIT 20";
            } else {
                sql += " ORDER BY t.attempt_count DESC, t.published_at DESC LIMIT 20";
            }
            
            List<Map<String, Object>> tests = testType != null && !testType.isBlank() 
                ? jdbcTemplate.queryForList(sql, testType)
                : jdbcTemplate.queryForList(sql);
            
            // Lấy sessions cho tất cả tests trong 1 query
            if (!tests.isEmpty()) {
                List<Long> testIds = tests.stream()
                    .map(t -> ((Number) t.get("id")).longValue())
                    .toList();
                
                String inClause = testIds.stream().map(id -> "?").reduce((a, b) -> a + "," + b).orElse("");
                List<Map<String, Object>> allSessions = jdbcTemplate.queryForList(
                    "SELECT ts.test_id, s.skill_type FROM test_sessions ts " +
                    "JOIN sessions s ON ts.session_id = s.id " +
                    "WHERE ts.test_id IN (" + inClause + ") AND ts.is_included = 1 " +
                    "ORDER BY ts.test_id, ts.order_index", testIds.toArray());
                
                // Group sessions by test_id
                Map<Long, List<Map<String, Object>>> sessionsByTest = allSessions.stream()
                    .collect(java.util.stream.Collectors.groupingBy(
                        s -> ((Number) s.get("test_id")).longValue()));
                
                // Add sessions to each test
                for (Map<String, Object> test : tests) {
                    Long testId = ((Number) test.get("id")).longValue();
                    List<Map<String, Object>> testSessions = sessionsByTest.getOrDefault(testId, List.of());
                    test.put("sessions", testSessions);
                }
            }
            
            return ResponseEntity.ok(tests);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/teacher-students")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<?> getTeacherStudents(Authentication authentication) {
        try {
            String username = authentication.getName();
            
            // Lấy user ID của teacher
            Long teacherId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE username = ?", Long.class, username);
            
            // Lấy class IDs mà teacher dạy
            List<Long> classIds = jdbcTemplate.queryForList(
                "SELECT class_id FROM class_teachers WHERE user_id = ? AND is_active = 1", 
                Long.class, teacherId);
            
            if (classIds.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "message", "Teacher không dạy lớp nào",
                    "teacherId", teacherId,
                    "classIds", classIds
                ));
            }
            
            // Lấy student IDs trong các lớp đó
            String inClause = classIds.stream().map(id -> "?").reduce((a, b) -> a + "," + b).orElse("");
            List<Map<String, Object>> students = jdbcTemplate.queryForList(
                "SELECT cs.user_id, u.username, u.full_name, cs.class_id " +
                "FROM class_students cs JOIN users u ON cs.user_id = u.id " +
                "WHERE cs.class_id IN (" + inClause + ") AND cs.status = 'ACTIVE'",
                classIds.toArray());
            
            // Lấy submissions của các students này
            if (!students.isEmpty()) {
                List<Long> studentIds = students.stream()
                    .map(s -> ((Number) s.get("user_id")).longValue())
                    .toList();
                
                String studentInClause = studentIds.stream().map(id -> "?").reduce((a, b) -> a + "," + b).orElse("");
                List<Map<String, Object>> submissions = jdbcTemplate.queryForList(
                    "SELECT s.id, s.user_id, u.username, s.submission_text, s.status, s.submitted_at " +
                    "FROM student_writing_submissions s JOIN users u ON s.user_id = u.id " +
                    "WHERE s.user_id IN (" + studentInClause + ") ORDER BY s.submitted_at DESC",
                    studentIds.toArray());
                
                return ResponseEntity.ok(Map.of(
                    "teacherId", teacherId,
                    "classIds", classIds,
                    "students", students,
                    "submissions", submissions
                ));
            }
            
            return ResponseEntity.ok(Map.of(
                "teacherId", teacherId,
                "classIds", classIds,
                "students", students,
                "submissions", List.of()
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private boolean hasRole(Authentication authentication, String role) {
        if (authentication == null) return false;
        String target = "ROLE_" + role;
        for (var authority : authentication.getAuthorities()) {
            if (target.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    @GetMapping("/my-tests")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getMyTests(Authentication authentication,
                                       @RequestParam(required = false) TestStatus status) {
        try {
            String username = authentication.getName();
            
            String sql = "SELECT t.id, t.title, t.description, t.test_type, t.status, " +
                        "t.duration_minutes, t.target_band, t.created_at " +
                        ", u.username AS createdByUsername " +
                        "FROM tests t " +
                        "JOIN users u ON t.created_by = u.id ";

            List<Map<String, Object>> tests;
            if (status != null) {
                sql += "WHERE u.username = ? AND t.status = ? ORDER BY t.created_at DESC";
                tests = jdbcTemplate.queryForList(sql, username, status.name());
            } else {
                sql += "WHERE u.username = ? AND t.status <> 'DELETED' ORDER BY t.created_at DESC";
                tests = jdbcTemplate.queryForList(sql, username);
            }
            return ResponseEntity.ok(tests);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
