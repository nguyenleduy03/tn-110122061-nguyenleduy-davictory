package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.enums.TestType;
import com.victory.DAVictory.service.TestManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Test Management", description = "API quản lý đề thi IELTS")
public class TestManagementController {

    private final TestManagementService testManagementService;

    // ===== TEST =====

    @PostMapping
    @Operation(summary = "Tạo đề thi mới", description = "Tạo đề thi ở trạng thái DRAFT")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Tạo thành công"),
        @ApiResponse(responseCode = "400", description = "Dữ liệu không hợp lệ")
    })
    public ResponseEntity<Test> createTest(
            @RequestBody Test test,
            @Parameter(description = "ID người tạo", required = true) @RequestParam Long createdByUserId) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(testManagementService.createTest(test, createdByUserId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết đề thi theo ID")
    @ApiResponse(responseCode = "200", description = "Tìm thấy")
    public ResponseEntity<Test> getTestById(
            @Parameter(description = "ID đề thi", required = true) @PathVariable Long id) {
        try {
            return ResponseEntity.ok(testManagementService.getTestById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/published")
    @Operation(summary = "Lấy danh sách đề thi đã xuất bản",
               description = "Lấy đề thi PUBLISHED, lọc theo testType nếu có")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<List<Test>> getPublishedTests(
            @Parameter(description = "Loại bài thi: ACADEMIC hoặc GENERAL")
            @RequestParam(required = false) TestType testType) {
        return ResponseEntity.ok(testManagementService.getPublishedTests(testType));
    }

    @GetMapping
    @Operation(summary = "Lấy đề thi theo trạng thái")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<List<Test>> getTestsByStatus(
            @Parameter(description = "Trạng thái: DRAFT, REVIEWING, PUBLISHED, ARCHIVED")
            @RequestParam TestStatus status) {
        return ResponseEntity.ok(testManagementService.getTestsByStatus(status));
    }

    @GetMapping("/search")
    @Operation(summary = "Tìm kiếm đề thi theo tên")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<List<Test>> searchTests(
            @Parameter(description = "Từ khóa tìm kiếm", required = true) @RequestParam String keyword) {
        return ResponseEntity.ok(testManagementService.searchTests(keyword));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Cập nhật trạng thái đề thi",
               description = "Chuyển trạng thái: DRAFT → REVIEWING → PUBLISHED → ARCHIVED")
    @ApiResponse(responseCode = "200", description = "Cập nhật thành công")
    public ResponseEntity<Test> updateTestStatus(
            @Parameter(description = "ID đề thi", required = true) @PathVariable Long id,
            @Parameter(description = "Trạng thái mới", required = true) @RequestParam TestStatus status,
            @Parameter(description = "ID người kiểm duyệt (khi PUBLISHED)")
            @RequestParam(required = false) Long reviewedByUserId) {
        try {
            return ResponseEntity.ok(testManagementService.updateTestStatus(id, status, reviewedByUserId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa mềm đề thi", description = "Chuyển trạng thái về DELETED")
    @ApiResponse(responseCode = "204", description = "Xóa thành công")
    public ResponseEntity<Void> deleteTest(
            @Parameter(description = "ID đề thi", required = true) @PathVariable Long id) {
        try {
            testManagementService.deleteTest(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ===== TEST SESSION =====

    @PostMapping("/{testId}/sessions")
    @Operation(summary = "Thêm session vào đề thi",
               description = "Gắn một kỹ năng (Listening/Reading/Writing/Speaking) vào đề thi")
    @ApiResponse(responseCode = "201", description = "Thêm thành công")
    public ResponseEntity<TestSession> addSession(
            @Parameter(description = "ID đề thi", required = true) @PathVariable Long testId,
            @Parameter(description = "ID session gốc", required = true) @RequestParam Long sessionId,
            @Parameter(description = "Thứ tự trong đề", required = true) @RequestParam Integer orderIndex,
            @Parameter(description = "Override thời gian (phút, null = mặc định)")
            @RequestParam(required = false) Integer durationMinutes) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(testManagementService.addSessionToTest(testId, sessionId, orderIndex, durationMinutes));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{testId}/sessions")
    @Operation(summary = "Lấy danh sách sessions của đề thi")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<List<TestSession>> getSessions(
            @Parameter(description = "ID đề thi", required = true) @PathVariable Long testId) {
        return ResponseEntity.ok(testManagementService.getTestSessions(testId));
    }

    // ===== TEST PART =====

    @PostMapping("/sessions/{testSessionId}/parts")
    @Operation(summary = "Thêm part vào test session")
    @ApiResponse(responseCode = "201", description = "Thêm thành công")
    public ResponseEntity<TestPart> addPart(
            @Parameter(description = "ID test session", required = true) @PathVariable Long testSessionId,
            @Parameter(description = "ID part gốc", required = true) @RequestParam Long partId,
            @Parameter(description = "Thứ tự trong session", required = true) @RequestParam Integer orderIndex) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(testManagementService.addPartToTestSession(testSessionId, partId, orderIndex));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/sessions/{testSessionId}/parts")
    @Operation(summary = "Lấy danh sách parts của test session")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<List<TestPart>> getParts(
            @Parameter(description = "ID test session", required = true) @PathVariable Long testSessionId) {
        return ResponseEntity.ok(testManagementService.getTestParts(testSessionId));
    }

    // ===== TEST QUESTION GROUP =====

    @PostMapping("/parts/{testPartId}/question-groups")
    @Operation(summary = "Thêm nhóm câu hỏi vào test part")
    @ApiResponse(responseCode = "201", description = "Thêm thành công")
    public ResponseEntity<TestQuestionGroup> addQuestionGroup(
            @Parameter(description = "ID test part", required = true) @PathVariable Long testPartId,
            @Parameter(description = "ID question group từ ngân hàng", required = true) @RequestParam Long questionGroupId,
            @Parameter(description = "Thứ tự nhóm câu hỏi", required = true) @RequestParam Integer orderIndex,
            @Parameter(description = "Số câu bắt đầu trong đề (vd: 1, 11, 21, 31)")
            @RequestParam(required = false) Integer questionFrom,
            @Parameter(description = "Số câu kết thúc trong đề (vd: 10, 20, 30, 40)")
            @RequestParam(required = false) Integer questionTo) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(testManagementService.addQuestionGroupToTestPart(
                            testPartId, questionGroupId, orderIndex, questionFrom, questionTo));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/parts/{testPartId}/question-groups")
    @Operation(summary = "Lấy danh sách nhóm câu hỏi của test part")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<List<TestQuestionGroup>> getQuestionGroups(
            @Parameter(description = "ID test part", required = true) @PathVariable Long testPartId) {
        return ResponseEntity.ok(testManagementService.getTestQuestionGroups(testPartId));
    }

    // ===== TEST SETTING =====

    @GetMapping("/{testId}/settings")
    @Operation(summary = "Lấy cài đặt của đề thi")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<TestSetting> getTestSetting(
            @Parameter(description = "ID đề thi", required = true) @PathVariable Long testId) {
        try {
            return ResponseEntity.ok(testManagementService.getTestSetting(testId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{testId}/settings")
    @Operation(summary = "Cập nhật cài đặt đề thi",
               description = "Cấu hình thời gian, ngẫu nhiên, điều hướng, proctoring...")
    @ApiResponse(responseCode = "200", description = "Cập nhật thành công")
    public ResponseEntity<TestSetting> updateTestSetting(
            @Parameter(description = "ID đề thi", required = true) @PathVariable Long testId,
            @RequestBody TestSetting setting) {
        try {
            return ResponseEntity.ok(testManagementService.updateTestSetting(testId, setting));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
