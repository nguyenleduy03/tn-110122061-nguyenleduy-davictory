package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.TestPartRequest;
import com.victory.DAVictory.dto.TestPartResponse;
import com.victory.DAVictory.entity.Part;
import com.victory.DAVictory.entity.TestPart;
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
public class TestPartController {

    private final TestManagementService testManagementService;
    private final TestStructureService testStructureService;

    // ============================================================
    // MASTER PARTS — parts gốc của 1 session (để biết có gì mà chọn)
    // ============================================================

    /**
     * Lấy tất cả parts gốc của 1 session master (để chọn thêm vào đề)
     * GET /api/tests/sessions/master/{sessionId}/parts
     */
    @GetMapping("/sessions/master/{sessionId}/parts")
    public ResponseEntity<?> getMasterPartsBySession(@PathVariable Long sessionId) {
        try {
            List<Part> parts = testStructureService.getPartsBySessionId(sessionId);
            List<Map<String, Object>> result = parts.stream().map(p -> {
                Map<String, Object> map = new java.util.LinkedHashMap<>();
                map.put("id", p.getId());
                map.put("name", p.getName());
                map.put("orderIndex", p.getOrderIndex());
                map.put("description", p.getDescription() != null ? p.getDescription() : "");
                map.put("instructions", p.getInstructions() != null ? p.getInstructions() : "");
                map.put("totalQuestions", p.getTotalQuestions());
                map.put("durationMinutes", p.getDurationMinutes());
                map.put("questionFormat", p.getQuestionFormat() != null ? p.getQuestionFormat() : "");
                map.put("scoreWeight", p.getScoreWeight());
                map.put("isActive", p.getIsActive());
                return map;
            }).collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ============================================================
    // TEST PARTS — parts của 1 test session cụ thể
    // ============================================================

    /**
     * Lấy danh sách parts đã có trong một test session
     * GET /api/tests/{testId}/sessions/{testSessionId}/parts
     */
    @GetMapping("/{testId}/sessions/{testSessionId}/parts")
    public ResponseEntity<?> getTestParts(@PathVariable Long testId,
                                           @PathVariable Long testSessionId) {
        try {
            List<TestPart> parts = testManagementService.getTestParts(testSessionId);
            List<TestPartResponse> result = parts.stream()
                    .map(TestPartResponse::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Lấy các part gốc chưa được thêm vào test session (available to add)
     * GET /api/tests/{testId}/sessions/{testSessionId}/parts/available
     */
    @GetMapping("/{testId}/sessions/{testSessionId}/parts/available")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getAvailableParts(@PathVariable Long testId,
                                                @PathVariable Long testSessionId) {
        try {
            List<Part> available = testManagementService.getAvailablePartsForTestSession(testSessionId);
            List<Map<String, Object>> result = available.stream().map(p -> {
                Map<String, Object> map = new java.util.LinkedHashMap<>();
                map.put("id", p.getId());
                map.put("name", p.getName());
                map.put("orderIndex", p.getOrderIndex());
                map.put("totalQuestions", p.getTotalQuestions());
                map.put("durationMinutes", p.getDurationMinutes());
                map.put("questionFormat", p.getQuestionFormat() != null ? p.getQuestionFormat() : "");
                map.put("description", p.getDescription() != null ? p.getDescription() : "");
                return map;
            }).collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Thêm 1 part vào test session
     * POST /api/tests/{testId}/sessions/{testSessionId}/parts
     * Body: { "partId": 1, "orderIndex": 1, "questionCount": null, "durationMinutes": null }
     */
    @PostMapping("/{testId}/sessions/{testSessionId}/parts")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> addPartToTestSession(@PathVariable Long testId,
                                                   @PathVariable Long testSessionId,
                                                   @RequestBody TestPartRequest request) {
        try {
            TestPart tp = testManagementService.addPartToTestSession(
                    testSessionId,
                    request.getPartId(),
                    request.getOrderIndex() != null ? request.getOrderIndex() : 1
            );
            // Update thêm questionCount / durationMinutes nếu có
            if (request.getQuestionCount() != null || request.getDurationMinutes() != null
                    || request.getIsIncluded() != null) {
                tp = testManagementService.updateTestPart(
                        tp.getId(),
                        request.getIsIncluded(),
                        request.getQuestionCount(),
                        request.getDurationMinutes(),
                        null
                );
            }
            return ResponseEntity.ok(TestPartResponse.fromEntity(tp));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Thêm tất cả parts của session vào test cùng lúc
     * POST /api/tests/{testId}/sessions/{testSessionId}/parts/add-all
     */
    @PostMapping("/{testId}/sessions/{testSessionId}/parts/add-all")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> addAllPartsToTestSession(@PathVariable Long testId,
                                                       @PathVariable Long testSessionId) {
        try {
            List<Part> available = testManagementService.getAvailablePartsForTestSession(testSessionId);
            List<TestPartResponse> added = available.stream().map(part -> {
                TestPart tp = testManagementService.addPartToTestSession(
                        testSessionId,
                        part.getId(),
                        part.getOrderIndex()
                );
                return TestPartResponse.fromEntity(tp);
            }).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "message", "Đã thêm " + added.size() + " part vào kỹ năng",
                    "parts", added
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Cập nhật part trong test session (bật/tắt, đổi số câu, đổi thời gian)
     * PUT /api/tests/{testId}/sessions/{testSessionId}/parts/{testPartId}
     */
    @PutMapping("/{testId}/sessions/{testSessionId}/parts/{testPartId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> updateTestPart(@PathVariable Long testId,
                                             @PathVariable Long testSessionId,
                                             @PathVariable Long testPartId,
                                             @RequestBody TestPartRequest request) {
        try {
            TestPart tp = testManagementService.updateTestPart(
                    testPartId,
                    request.getIsIncluded(),
                    request.getQuestionCount(),
                    request.getDurationMinutes(),
                    request.getOrderIndex()
            );
            return ResponseEntity.ok(TestPartResponse.fromEntity(tp));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Xóa part khỏi test session
     * DELETE /api/tests/{testId}/sessions/{testSessionId}/parts/{testPartId}
     */
    @DeleteMapping("/{testId}/sessions/{testSessionId}/parts/{testPartId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> removePartFromTestSession(@PathVariable Long testId,
                                                        @PathVariable Long testSessionId,
                                                        @PathVariable Long testPartId) {
        try {
            testManagementService.removePartFromTestSession(testPartId);
            return ResponseEntity.ok(Map.of("message", "Đã xóa part khỏi kỹ năng"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
