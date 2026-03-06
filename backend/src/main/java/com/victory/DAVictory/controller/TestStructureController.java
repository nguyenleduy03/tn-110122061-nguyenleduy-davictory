package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.DifficultyLevel;
import com.victory.DAVictory.entity.Part;
import com.victory.DAVictory.entity.Session;
import com.victory.DAVictory.enums.TestType;
import com.victory.DAVictory.service.TestStructureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/test-structure")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Test Structure", description = "API cấu trúc bài thi IELTS (Sessions, Parts, Difficulty Levels)")
public class TestStructureController {

    private final TestStructureService testStructureService;

    // ===== SESSIONS =====
    @GetMapping("/sessions")
    @Operation(summary = "Lấy danh sách sessions theo loại bài thi",
               description = "Trả về 4 kỹ năng (Listening, Reading, Writing, Speaking) của loại bài thi")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<List<Session>> getSessionsByTestType(
            @Parameter(description = "Loại bài thi: ACADEMIC hoặc GENERAL", required = true)
            @RequestParam TestType testType) {
        return ResponseEntity.ok(testStructureService.getSessionsByTestType(testType));
    }

    // ===== PARTS =====
    @GetMapping("/sessions/{sessionId}/parts")
    @Operation(summary = "Lấy danh sách parts của một session",
               description = "Trả về các parts/passages/tasks trong một kỹ năng thi")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<List<Part>> getPartsBySession(
            @Parameter(description = "ID của session", required = true)
            @PathVariable Long sessionId) {
        return ResponseEntity.ok(testStructureService.getPartsBySessionId(sessionId));
    }

    // ===== DIFFICULTY LEVELS =====
    @GetMapping("/difficulty-levels")
    @Operation(summary = "Lấy danh sách mức độ khó",
               description = "Trả về tất cả các cấp độ khó từ Beginner đến Advanced")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<List<DifficultyLevel>> getDifficultyLevels() {
        return ResponseEntity.ok(testStructureService.getAllDifficultyLevels());
    }
}
