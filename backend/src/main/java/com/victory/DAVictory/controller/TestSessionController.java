package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.TestSessionRequest;
import com.victory.DAVictory.dto.TestSessionResponse;
import com.victory.DAVictory.entity.Session;
import com.victory.DAVictory.entity.TestSession;
import com.victory.DAVictory.enums.TestType;
import com.victory.DAVictory.service.TestManagementService;
import com.victory.DAVictory.service.TestStructureService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
public class TestSessionController {

    private final TestManagementService testManagementService;
    private final TestStructureService testStructureService;

    // ===================================================
    // MASTER SESSIONS — danh sách session gốc để chọn
    // ===================================================

    /**
     * Lấy tất cả session gốc (Listening/Reading/Writing/Speaking) theo loại đề
     * Dùng để hiển thị danh sách khi thêm kỹ năng vào đề thi
     * GET /api/tests/sessions/master?testType=ACADEMIC
     */
    @GetMapping("/sessions/master")
    public ResponseEntity<?> getMasterSessions(@RequestParam(required = false) TestType testType) {
        try {
            List<Session> sessions;
            if (testType != null) {
                sessions = testStructureService.getSessionsByTestType(testType);
            } else {
                sessions = testStructureService.getAllSessions();
            }
            List<Map<String, Object>> result = sessions.stream().map(s -> Map.<String, Object>of(
                    "id", s.getId(),
                    "name", s.getName(),
                    "skillType", s.getSkillType().name(),
                    "testType", s.getTestType().name(),
                    "durationMinutes", s.getDurationMinutes(),
                    "totalQuestions", s.getTotalQuestions(),
                    "orderIndex", s.getOrderIndex(),
                    "instructions", s.getInstructions() != null ? s.getInstructions() : ""
            )).collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Lấy các session gốc chưa được thêm vào đề thi (available to add)
     * GET /api/tests/{testId}/sessions/available
     */
    @GetMapping("/{testId}/sessions/available")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getAvailableSessions(@PathVariable Long testId) {
        try {
            List<Session> available = testManagementService.getAvailableSessionsForTest(testId);
            List<Map<String, Object>> result = available.stream().map(s -> Map.<String, Object>of(
                    "id", s.getId(),
                    "name", s.getName(),
                    "skillType", s.getSkillType().name(),
                    "testType", s.getTestType().name(),
                    "durationMinutes", s.getDurationMinutes(),
                    "totalQuestions", s.getTotalQuestions(),
                    "orderIndex", s.getOrderIndex()
            )).collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ===================================================
    // TEST SESSIONS — kỹ năng của một đề thi cụ thể
    // ===================================================

    /**
     * Lấy danh sách kỹ năng đã có trong đề thi
     * GET /api/tests/{testId}/sessions
     */
    @GetMapping("/{testId}/sessions")
    public ResponseEntity<?> getTestSessions(@PathVariable Long testId) {
        try {
            List<TestSession> sessions = testManagementService.getTestSessions(testId);
            List<TestSessionResponse> result = sessions.stream()
                    .map(TestSessionResponse::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Thêm kỹ năng vào đề thi
     * POST /api/tests/{testId}/sessions
     * Body: { "sessionId": 1, "orderIndex": 1, "durationMinutes": null, "instructions": null }
     */
    @PostMapping("/{testId}/sessions")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> addSessionToTest(@PathVariable Long testId,
                                               @RequestBody TestSessionRequest request) {
        try {
            TestSession ts = testManagementService.addSessionToTest(
                    testId,
                    request.getSessionId(),
                    request.getOrderIndex() != null ? request.getOrderIndex() : 1,
                    request.getDurationMinutes()
            );
            // Update thêm instructions và isIncluded nếu có
            if (request.getInstructions() != null || request.getIsIncluded() != null) {
                ts = testManagementService.updateTestSession(
                        ts.getId(),
                        request.getIsIncluded(),
                        null,
                        request.getInstructions(),
                        null
                );
            }
            return ResponseEntity.ok(TestSessionResponse.fromEntity(ts));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Thêm tất cả 4 kỹ năng theo loại đề thi cùng lúc (tạo nhanh full test)
     * POST /api/tests/{testId}/sessions/add-all?testType=ACADEMIC
     */
    @PostMapping("/{testId}/sessions/add-all")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> addAllSessionsToTest(@PathVariable Long testId,
                                                   @RequestParam(required = false) TestType testType) {
        try {
            List<Session> available = testManagementService.getAvailableSessionsForTest(testId);
            List<TestSessionResponse> added = available.stream().map(session -> {
                TestSession ts = testManagementService.addSessionToTest(
                        testId,
                        session.getId(),
                        session.getOrderIndex(),
                        null
                );
                return TestSessionResponse.fromEntity(ts);
            }).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "message", "Đã thêm " + added.size() + " kỹ năng vào đề thi",
                    "sessions", added
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Cập nhật kỹ năng trong đề (bật/tắt, đổi thời gian, đổi hướng dẫn)
     * PUT /api/tests/{testId}/sessions/{testSessionId}
     */
    @PutMapping("/{testId}/sessions/{testSessionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> updateTestSession(@PathVariable Long testId,
                                                @PathVariable Long testSessionId,
                                                @RequestBody TestSessionRequest request) {
        try {
            TestSession ts = testManagementService.updateTestSession(
                    testSessionId,
                    request.getIsIncluded(),
                    request.getDurationMinutes(),
                    request.getInstructions(),
                    request.getOrderIndex()
            );
            return ResponseEntity.ok(TestSessionResponse.fromEntity(ts));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Xóa kỹ năng khỏi đề thi
     * DELETE /api/tests/{testId}/sessions/{testSessionId}
     */
    @DeleteMapping("/{testId}/sessions/{testSessionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> removeSessionFromTest(@PathVariable Long testId,
                                                    @PathVariable Long testSessionId) {
        try {
            testManagementService.removeSessionFromTest(testSessionId);
            return ResponseEntity.ok(Map.of("message", "Đã xóa kỹ năng khỏi đề thi"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
