package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.Part;
import com.victory.DAVictory.entity.Session;
import com.victory.DAVictory.enums.TestType;
import com.victory.DAVictory.service.TestStructureService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/test-structure")
@RequiredArgsConstructor
public class TestStructureController {

    private final TestStructureService testStructureService;

    /**
     * GET /api/test-structure/sessions?testType=ACADEMIC
     * Lấy danh sách sessions (Listening, Reading, Writing, Speaking) theo loại đề.
     */
    @GetMapping("/sessions")
    public ResponseEntity<?> getSessions(@RequestParam(defaultValue = "ACADEMIC") TestType testType) {
        try {
            List<Session> sessions = testStructureService.getSessionsByTestType(testType);
            List<Map<String, Object>> result = sessions.stream().<Map<String, Object>>map(s -> {
                Map<String, Object> map = new java.util.LinkedHashMap<>();
                map.put("id", s.getId());
                map.put("name", s.getName());
                map.put("skillType", s.getSkillType());
                map.put("durationMinutes", s.getDurationMinutes());
                map.put("totalQuestions", s.getTotalQuestions());
                map.put("orderIndex", s.getOrderIndex());
                return map;
            }).toList();
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/test-structure/sessions/{sessionId}/parts
     * Lấy danh sách parts của một session.
     */
    @GetMapping("/sessions/{sessionId}/parts")
    public ResponseEntity<?> getPartsBySession(@PathVariable Long sessionId) {
        try {
            List<Part> parts = testStructureService.getPartsBySessionId(sessionId);
            List<Map<String, Object>> result = parts.stream().<Map<String, Object>>map(p -> {
                Map<String, Object> map = new java.util.LinkedHashMap<>();
                map.put("id", p.getId());
                map.put("name", p.getName());
                map.put("orderIndex", p.getOrderIndex());
                map.put("totalQuestions", p.getTotalQuestions());
                map.put("instructions", p.getInstructions());
                return map;
            }).toList();
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
