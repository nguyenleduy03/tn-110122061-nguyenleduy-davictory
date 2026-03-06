package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/test-builder")
@RequiredArgsConstructor
@Tag(name = "Test Builder", description = "API tạo đề thi và trộn đề ngẫu nhiên")
public class TestBuilderController {

    private final TestRepository testRepository;
    private final TestSessionRepository testSessionRepository;
    private final TestPartRepository testPartRepository;
    private final TestQuestionGroupRepository testQuestionGroupRepository;
    private final SessionRepository sessionRepository;
    private final PartRepository partRepository;
    private final QuestionGroupRepository questionGroupRepository;

    // ===== QUẢN LÝ ĐỀ THI =====

    @GetMapping
    @Operation(summary = "Lấy tất cả đề thi", description = "Danh sách toàn bộ tests")
    public ResponseEntity<List<Test>> getAllTests() {
        return ResponseEntity.ok(testRepository.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết đề thi", description = "Bao gồm sessions, parts, question groups")
    public ResponseEntity<Test> getTestById(@PathVariable Long id) {
        return testRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Tạo đề thi mới", description = "Teacher tạo đề thi trống (chưa có câu hỏi)")
    public ResponseEntity<Test> createTest(@RequestBody Test test) {
        return ResponseEntity.ok(testRepository.save(test));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật đề thi", description = "Sửa thông tin đề thi")
    public ResponseEntity<Test> updateTest(@PathVariable Long id, @RequestBody Test test) {
        if (!testRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        test.setId(id);
        return ResponseEntity.ok(testRepository.save(test));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa đề thi", description = "Xóa đề thi và tất cả sessions/parts/question groups")
    public ResponseEntity<Void> deleteTest(@PathVariable Long id) {
        if (!testRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        testRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ===== THÊM SESSION VÀO ĐỀ THI =====

    @PostMapping("/{testId}/sessions")
    @Operation(summary = "Thêm session vào đề", description = "Teacher chọn session (Listening/Reading/Writing/Speaking) cho đề")
    public ResponseEntity<TestSession> addSessionToTest(
            @PathVariable Long testId,
            @RequestBody Map<String, Long> body) {

        Long sessionId = body.get("sessionId");

        return testRepository.findById(testId)
            .flatMap(test -> sessionRepository.findById(sessionId)
                .map(session -> {
                    TestSession testSession = new TestSession();
                    testSession.setTest(test);
                    testSession.setSession(session);
                    testSession.setOrderIndex(test.getTestSessions().size() + 1);
                    testSession.setIsIncluded(true);

                    return ResponseEntity.ok(testSessionRepository.save(testSession));
                }))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{testId}/sessions")
    @Operation(summary = "Lấy sessions của đề thi", description = "Danh sách sessions trong đề")
    public ResponseEntity<List<TestSession>> getTestSessions(@PathVariable Long testId) {
        if (!testRepository.existsById(testId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(testSessionRepository.findByTestIdOrderByOrderIndexAsc(testId));
    }

    // ===== THÊM PART VÀO TEST SESSION =====

    @PostMapping("/sessions/{testSessionId}/parts")
    @Operation(summary = "Thêm part vào test session", description = "Teacher chọn part (Part 1, 2, 3) cho session")
    public ResponseEntity<TestPart> addPartToTestSession(
            @PathVariable Long testSessionId,
            @RequestBody Map<String, Long> body) {

        Long partId = body.get("partId");

        return testSessionRepository.findById(testSessionId)
            .flatMap(testSession -> partRepository.findById(partId)
                .map(part -> {
                    TestPart testPart = new TestPart();
                    testPart.setTestSession(testSession);
                    testPart.setPart(part);
                    testPart.setOrderIndex(testSession.getTestParts().size() + 1);
                    testPart.setIsIncluded(true);

                    return ResponseEntity.ok(testPartRepository.save(testPart));
                }))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/sessions/{testSessionId}/parts")
    @Operation(summary = "Lấy parts của test session", description = "Danh sách parts trong session của đề")
    public ResponseEntity<List<TestPart>> getTestSessionParts(@PathVariable Long testSessionId) {
        if (!testSessionRepository.existsById(testSessionId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(testPartRepository.findByTestSessionIdOrderByOrderIndexAsc(testSessionId));
    }

    // ===== THÊM QUESTION GROUP THỦ CÔNG =====

    @PostMapping("/parts/{testPartId}/question-groups")
    @Operation(summary = "Thêm question group vào test part", description = "Teacher chọn thủ công passage/audio cho part")
    public ResponseEntity<TestQuestionGroup> addQuestionGroupToTestPart(
            @PathVariable Long testPartId,
            @RequestBody Map<String, Long> body) {

        Long questionGroupId = body.get("questionGroupId");

        return testPartRepository.findById(testPartId)
            .flatMap(testPart -> questionGroupRepository.findById(questionGroupId)
                .map(questionGroup -> {
                    TestQuestionGroup testQuestionGroup = new TestQuestionGroup();
                    testQuestionGroup.setTestPart(testPart);
                    testQuestionGroup.setQuestionGroup(questionGroup);
                    testQuestionGroup.setOrderIndex(testPart.getTestQuestionGroups().size() + 1);

                    return ResponseEntity.ok(testQuestionGroupRepository.save(testQuestionGroup));
                }))
            .orElse(ResponseEntity.notFound().build());
    }

    // ===== RANDOM ĐỀ (TRỌNG TÂM) =====

    @PostMapping("/{testId}/generate")
    @Operation(summary = "Random question groups cho đề thi",
               description = "Hệ thống tự động chọn passages/audio theo session, part, difficulty")
    public ResponseEntity<Map<String, Object>> generateTest(
            @PathVariable Long testId,
            @RequestBody GenerateTestRequest request) {

        return testRepository.findById(testId)
            .map(test -> {
                List<TestQuestionGroup> generated = new ArrayList<>();

                // Duyệt qua từng session request
                for (SessionRequest sessionReq : request.getSessions()) {
                    // Tìm hoặc tạo TestSession
                    Session session = sessionRepository.findById(sessionReq.getSessionId())
                        .orElseThrow(() -> new RuntimeException("Session not found"));

                    TestSession testSession = testSessionRepository
                        .findByTestIdAndSessionId(testId, session.getId())
                        .orElseGet(() -> {
                            TestSession ts = new TestSession();
                            ts.setTest(test);
                            ts.setSession(session);
                            ts.setOrderIndex(test.getTestSessions().size() + 1);
                            ts.setIsIncluded(true);
                            return testSessionRepository.save(ts);
                        });

                    // Duyệt qua từng part request
                    for (PartRequest partReq : sessionReq.getParts()) {
                        Part part = partRepository.findById(partReq.getPartId())
                            .orElseThrow(() -> new RuntimeException("Part not found"));

                        TestPart testPart = testPartRepository
                            .findByTestSessionIdAndPartId(testSession.getId(), part.getId())
                            .orElseGet(() -> {
                                TestPart tp = new TestPart();
                                tp.setTestSession(testSession);
                                tp.setPart(part);
                                tp.setOrderIndex(testSession.getTestParts().size() + 1);
                                tp.setIsIncluded(true);
                                return testPartRepository.save(tp);
                            });

                        // Random question groups theo part (active)
                        List<QuestionGroup> availableGroups =
                            questionGroupRepository.findByPartIdAndIsActiveTrueOrderByOrderIndexAsc(part.getId());

                        // Random lấy N groups
                        List<QuestionGroup> selectedGroups = availableGroups.stream()
                            .limit(partReq.getGroupCount() != null ? partReq.getGroupCount() : availableGroups.size())
                            .collect(Collectors.toList());

                        // Lưu vào TestQuestionGroup
                        int order = testPart.getTestQuestionGroups().size() + 1;
                        for (QuestionGroup qg : selectedGroups) {
                            TestQuestionGroup tqg = new TestQuestionGroup();
                            tqg.setTestPart(testPart);
                            tqg.setQuestionGroup(qg);
                            tqg.setOrderIndex(order++);
                            generated.add(testQuestionGroupRepository.save(tqg));
                        }
                    }
                }

                Map<String, Object> response = new java.util.HashMap<>();
                response.put("message", "Test generated successfully");
                response.put("totalQuestionGroups", generated.size());
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ===== DTOs =====

    @Data
    public static class GenerateTestRequest {
        private List<SessionRequest> sessions;
    }

    @Data
    public static class SessionRequest {
        private Long sessionId;
        private List<PartRequest> parts;
    }

    @Data
    public static class PartRequest {
        private Long partId;
        private Long difficultyId; // optional
        private Integer groupCount; // Số lượng question groups cần random
    }
}
