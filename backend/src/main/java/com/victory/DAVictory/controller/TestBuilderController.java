package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.ShuffleTestRequest;
import com.victory.DAVictory.dto.TestFullResponse;
import com.victory.DAVictory.dto.TestSaveRequest;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.service.TestBuilderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * API tạo đề thi, lưu/tải cấu trúc đầy đủ, và trộn đề ngẫu nhiên.
 *
 * Endpoints chính:
 *   POST /api/test-builder/save-full   → Lưu toàn bộ đề thi (Test → Sessions → Parts → Groups → Questions)
 *   GET  /api/test-builder/{id}/full   → Tải toàn bộ đề thi với câu hỏi lồng sâu
 *   POST /api/test-builder/shuffle     → Trộn đề: lấy ngẫu nhiên từng Part từ đề PUBLISHED
 *   GET  /api/test-builder             → Danh sách đề thi
 *   DELETE /api/test-builder/{id}      → Xóa mềm đề thi
 */
@RestController
@RequestMapping("/api/test-builder")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Test Builder", description = "API tạo đề thi, lưu/tải cấu trúc đầy đủ, trộn đề ngẫu nhiên")
public class TestBuilderController {

    private final TestBuilderService testBuilderService;

    // ═══════════════════════════════════════════════════════
    //  LƯU TOÀN BỘ (Save Full Test)
    // ═══════════════════════════════════════════════════════

    @PostMapping("/save-full")
    @Operation(
        summary = "Lưu toàn bộ đề thi",
        description = "Nhận cấu trúc đề thi đầy đủ từ TestBuilder frontend. "
                    + "Tạo Test → TestSession → TestPart → TestQuestionGroup, đồng thời "
                    + "tạo QuestionGroup → Question → Options/Answers trong ngân hàng câu hỏi."
    )
    public ResponseEntity<?> saveFullTest(@RequestBody TestSaveRequest request) {
        try {
            TestFullResponse result = testBuilderService.saveFullTest(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ═══════════════════════════════════════════════════════
    //  TẢI TOÀN BỘ (Load Full Test)
    // ═══════════════════════════════════════════════════════

    @GetMapping("/{id}/full")
    @Operation(
        summary = "Tải toàn bộ đề thi",
        description = "Trả về cấu trúc đề thi đầy đủ bao gồm sessions, parts, "
                    + "question groups, questions, options và answers. "
                    + "Dùng để mở lại đề thi trong TestBuilder hoặc hiển thị cho học viên."
    )
    public ResponseEntity<?> loadFullTest(@PathVariable Long id) {
        try {
            TestFullResponse result = testBuilderService.loadFullTest(id);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ═══════════════════════════════════════════════════════
    //  TRỘN ĐỀ (Shuffle Test)
    // ═══════════════════════════════════════════════════════

    @PostMapping("/shuffle")
    @Operation(
        summary = "Trộn đề thi ngẫu nhiên",
        description = "Tạo đề mới bằng cách chọn ngẫu nhiên từng Part từ các đề PUBLISHED. "
                    + "Part 1 Listening chỉ trộn với Part 1 Listening, Part 2 với Part 2, v.v. "
                    + "Mỗi Part được lấy nguyên vẹn (toàn bộ question groups + questions)."
    )
    public ResponseEntity<?> shuffleTest(@RequestBody ShuffleTestRequest request) {
        try {
            TestFullResponse result = testBuilderService.shuffleTest(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ═══════════════════════════════════════════════════════
    //  DANH SÁCH & QUẢN LÝ
    // ═══════════════════════════════════════════════════════

    @GetMapping
    @Operation(summary = "Lấy danh sách đề thi", description = "Trả về tất cả đề thi (tóm tắt, không kèm questions)")
    public ResponseEntity<List<TestFullResponse>> getAllTests(
            @RequestParam(required = false) TestStatus status) {
        if (status != null) {
            return ResponseEntity.ok(testBuilderService.getTestsByStatus(status));
        }
        return ResponseEntity.ok(testBuilderService.getAllTests());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa mềm đề thi", description = "Chuyển trạng thái về DELETED")
    public ResponseEntity<?> deleteTest(@PathVariable Long id) {
        try {
            testBuilderService.deleteTest(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
