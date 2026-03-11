package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.*;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.enums.QuestionTypeEnum;
import com.victory.DAVictory.service.QuestionBankService;
import com.victory.DAVictory.service.TestManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
public class QuestionGroupController {

    private final QuestionBankService questionBankService;
    private final TestManagementService testManagementService;

    // ════════════════════════════════════════════════════════════════
    // MASTER DATA — Question Types (tra cứu loại câu hỏi)
    // ════════════════════════════════════════════════════════════════

    /**
     * Lấy danh sách tất cả loại câu hỏi (MCQ, TFNG, FILL_BLANK...)
     * GET /api/tests/question-types
     */
    @GetMapping("/question-types")
    public ResponseEntity<?> getQuestionTypes() {
        try {
            List<QuestionType> types = questionBankService.getAllActiveQuestionTypes();
            List<Map<String, Object>> result = types.stream().map(t -> {
                Map<String, Object> map = new java.util.LinkedHashMap<>();
                map.put("id", t.getId());
                map.put("code", t.getCode());
                map.put("displayName", t.getDisplayName());
                map.put("description", t.getDescription());
                map.put("instructions", t.getInstructions());
                map.put("applicableSkills", t.getApplicableSkills());
                map.put("hasOptions", t.getHasOptions());
                map.put("hasTextAnswer", t.getHasTextAnswer());
                map.put("hasMatching", t.getHasMatching());
                return map;
            }).collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Lấy tất cả enum question types (không cần DB, nhanh hơn)
     * GET /api/tests/question-types/enum
     * Trả về mảng: [{code, displayName, description, applicableSkills, hasOptions, hasTextAnswer, hasMatching}]
     */
    @GetMapping("/question-types/enum")
    public ResponseEntity<?> getQuestionTypeEnums() {
        List<Map<String, Object>> result = Arrays.stream(QuestionTypeEnum.values()).map(qte -> {
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("code", qte.name());
            map.put("displayName", qte.getDisplayName());
            map.put("description", qte.getDescription());
            map.put("applicableSkills", qte.getApplicableSkills());
            map.put("hasOptions", qte.isHasOptions());
            map.put("hasTextAnswer", qte.isHasTextAnswer());
            map.put("hasMatching", qte.isHasMatching());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ════════════════════════════════════════════════════════════════
    // QUESTION GROUPS — Ngân hàng câu hỏi (tạo group + questions)
    // ════════════════════════════════════════════════════════════════

    /**
     * Lấy tất cả question groups của 1 part (ngân hàng)
     * GET /api/tests/parts/{partId}/question-groups
     */
    @GetMapping("/parts/{partId}/question-groups")
    public ResponseEntity<?> getQuestionGroupsByPart(@PathVariable Long partId) {
        try {
            List<QuestionGroup> groups = questionBankService.getGroupsByPart(partId);
            List<QuestionGroupResponse> result = groups.stream()
                    .map(QuestionGroupResponse::fromEntitySummary)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Lấy chi tiết 1 question group (kèm danh sách câu hỏi đầy đủ)
     * GET /api/tests/question-groups/{groupId}
     */
    @GetMapping("/question-groups/{groupId}")
    public ResponseEntity<?> getQuestionGroupDetail(@PathVariable Long groupId) {
        try {
            QuestionGroup group = questionBankService.getGroupById(groupId);
            return ResponseEntity.ok(QuestionGroupResponse.fromEntity(group));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Tạo question group mới (kèm questions + options/answers + matching pairs)
     * POST /api/tests/parts/{partId}/question-groups
     */
    @PostMapping("/parts/{partId}/question-groups")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> createQuestionGroup(@PathVariable Long partId,
                                                  @RequestBody QuestionGroupRequest request) {
        try {
            QuestionGroup group = questionBankService.createFullQuestionGroup(partId, request);
            return ResponseEntity.ok(QuestionGroupResponse.fromEntity(group));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Cập nhật thông tin question group (không ảnh hưởng questions bên trong)
     * PUT /api/tests/question-groups/{groupId}
     */
    @PutMapping("/question-groups/{groupId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> updateQuestionGroup(@PathVariable Long groupId,
                                                  @RequestBody QuestionGroupRequest request) {
        try {
            QuestionGroup group = questionBankService.updateQuestionGroup(groupId, request);
            return ResponseEntity.ok(QuestionGroupResponse.fromEntity(group));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Xóa mềm question group (deactivate)
     * DELETE /api/tests/question-groups/{groupId}
     */
    @DeleteMapping("/question-groups/{groupId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> deleteQuestionGroup(@PathVariable Long groupId) {
        try {
            questionBankService.deactivateQuestionGroup(groupId);
            return ResponseEntity.ok(Map.of("message", "Đã xóa nhóm câu hỏi"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ════════════════════════════════════════════════════════════════
    // QUESTIONS — Câu hỏi trong group
    // ════════════════════════════════════════════════════════════════

    /**
     * Lấy danh sách câu hỏi trong 1 group
     * GET /api/tests/question-groups/{groupId}/questions
     */
    @GetMapping("/question-groups/{groupId}/questions")
    public ResponseEntity<?> getQuestionsByGroup(@PathVariable Long groupId) {
        try {
            QuestionGroup group = questionBankService.getGroupById(groupId);
            QuestionGroupResponse resp = QuestionGroupResponse.fromEntity(group);
            return ResponseEntity.ok(resp.getQuestions());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Thêm 1 câu hỏi vào group
     * POST /api/tests/question-groups/{groupId}/questions
     */
    @PostMapping("/question-groups/{groupId}/questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> addQuestionToGroup(@PathVariable Long groupId,
                                                 @RequestBody QuestionGroupRequest.QuestionRequest request) {
        try {
            Question question = questionBankService.addQuestionToGroup(groupId, request);
            // Trả về group đầy đủ (bao gồm câu vừa thêm)
            QuestionGroup group = questionBankService.getGroupById(groupId);
            return ResponseEntity.ok(QuestionGroupResponse.fromEntity(group));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Cập nhật 1 câu hỏi (kèm options/answers mới nếu gửi kèm)
     * PUT /api/tests/questions/{questionId}
     */
    @PutMapping("/questions/{questionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> updateQuestion(@PathVariable Long questionId,
                                             @RequestBody QuestionGroupRequest.QuestionRequest request) {
        try {
            Question question = questionBankService.updateQuestion(questionId, request);
            // Trả về group đầy đủ chứa câu hỏi
            QuestionGroup group = questionBankService.getGroupById(question.getQuestionGroup().getId());
            return ResponseEntity.ok(QuestionGroupResponse.fromEntity(group));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Xóa mềm câu hỏi (deactivate)
     * DELETE /api/tests/questions/{questionId}
     */
    @DeleteMapping("/questions/{questionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> deleteQuestion(@PathVariable Long questionId) {
        try {
            questionBankService.deactivateQuestion(questionId);
            return ResponseEntity.ok(Map.of("message", "Đã xóa câu hỏi"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ════════════════════════════════════════════════════════════════
    // TEST QUESTION GROUPS — Liên kết group vào test part
    // ════════════════════════════════════════════════════════════════

    /**
     * Lấy danh sách question groups đã thêm vào 1 test part
     * GET /api/tests/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups
     */
    @GetMapping("/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups")
    public ResponseEntity<?> getTestQuestionGroups(@PathVariable Long testId,
                                                    @PathVariable Long testSessionId,
                                                    @PathVariable Long testPartId) {
        try {
            List<TestQuestionGroup> tqgs = testManagementService.getTestQuestionGroups(testPartId);
            List<TestQuestionGroupResponse> result = tqgs.stream()
                    .map(TestQuestionGroupResponse::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Lấy các question groups chưa được thêm vào test part (available to add)
     * GET /api/tests/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups/available
     */
    @GetMapping("/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups/available")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getAvailableQuestionGroups(@PathVariable Long testId,
                                                         @PathVariable Long testSessionId,
                                                         @PathVariable Long testPartId) {
        try {
            List<QuestionGroup> available = testManagementService
                    .getAvailableQuestionGroupsForTestPart(testPartId);
            List<QuestionGroupResponse> result = available.stream()
                    .map(QuestionGroupResponse::fromEntitySummary)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Thêm 1 question group vào test part
     * POST /api/tests/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups
     */
    @PostMapping("/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> addQuestionGroupToTestPart(@PathVariable Long testId,
                                                         @PathVariable Long testSessionId,
                                                         @PathVariable Long testPartId,
                                                         @RequestBody TestQuestionGroupRequest request) {
        try {
            TestQuestionGroup tqg = testManagementService.addQuestionGroupToTestPart(
                    testPartId,
                    request.getQuestionGroupId(),
                    request.getOrderIndex() != null ? request.getOrderIndex() : 0,
                    request.getQuestionFrom(),
                    request.getQuestionTo()
            );
            // Cập nhật thêm custom fields nếu có
            if (request.getIsRandomOrder() != null || request.getCustomTitle() != null
                    || request.getCustomInstructions() != null) {
                tqg = testManagementService.updateTestQuestionGroup(
                        tqg.getId(),
                        null,
                        null,
                        null,
                        request.getIsRandomOrder(),
                        request.getCustomTitle(),
                        request.getCustomInstructions()
                );
            }
            return ResponseEntity.ok(TestQuestionGroupResponse.fromEntity(tqg));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Thêm tất cả question groups có sẵn vào test part
     * POST /api/tests/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups/add-all
     */
    @PostMapping("/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups/add-all")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> addAllQuestionGroupsToTestPart(@PathVariable Long testId,
                                                              @PathVariable Long testSessionId,
                                                              @PathVariable Long testPartId) {
        try {
            List<QuestionGroup> available = testManagementService
                    .getAvailableQuestionGroupsForTestPart(testPartId);
            List<TestQuestionGroupResponse> added = available.stream().map(group -> {
                TestQuestionGroup tqg = testManagementService.addQuestionGroupToTestPart(
                        testPartId,
                        group.getId(),
                        group.getOrderIndex(),
                        group.getFromQuestion(),
                        group.getToQuestion()
                );
                return TestQuestionGroupResponse.fromEntity(tqg);
            }).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "message", "Đã thêm " + added.size() + " nhóm câu hỏi vào part",
                    "questionGroups", added
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Cập nhật test question group (đổi thứ tự, custom title, random...)
     * PUT /api/tests/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups/{tqgId}
     */
    @PutMapping("/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups/{tqgId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> updateTestQuestionGroup(@PathVariable Long testId,
                                                      @PathVariable Long testSessionId,
                                                      @PathVariable Long testPartId,
                                                      @PathVariable Long tqgId,
                                                      @RequestBody TestQuestionGroupRequest request) {
        try {
            TestQuestionGroup tqg = testManagementService.updateTestQuestionGroup(
                    tqgId,
                    request.getOrderIndex(),
                    request.getQuestionFrom(),
                    request.getQuestionTo(),
                    request.getIsRandomOrder(),
                    request.getCustomTitle(),
                    request.getCustomInstructions()
            );
            return ResponseEntity.ok(TestQuestionGroupResponse.fromEntity(tqg));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Xóa question group khỏi test part
     * DELETE /api/tests/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups/{tqgId}
     */
    @DeleteMapping("/{testId}/sessions/{testSessionId}/parts/{testPartId}/question-groups/{tqgId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> removeQuestionGroupFromTestPart(@PathVariable Long testId,
                                                               @PathVariable Long testSessionId,
                                                               @PathVariable Long testPartId,
                                                               @PathVariable Long tqgId) {
        try {
            testManagementService.removeQuestionGroupFromTestPart(tqgId);
            return ResponseEntity.ok(Map.of("message", "Đã xóa nhóm câu hỏi khỏi part"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
