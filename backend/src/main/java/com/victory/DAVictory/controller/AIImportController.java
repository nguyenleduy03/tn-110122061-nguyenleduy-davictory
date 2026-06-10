package com.victory.DAVictory.controller;

import com.victory.DAVictory.service.AIBridgeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/ai/import")
@Slf4j
public class AIImportController {

    private final AIBridgeService aiBridgeService;

    public AIImportController(AIBridgeService aiBridgeService) {
        this.aiBridgeService = aiBridgeService;
    }

    @PostMapping("/parse")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> parseDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "skillHint", defaultValue = "") String skillHint,
            @RequestParam(value = "testType", defaultValue = "ACADEMIC") String testType) {
        try {
            byte[] content = file.getBytes();
            String filename = file.getOriginalFilename();
            Map<String, Object> result = aiBridgeService.importParseDocument(content, filename, skillHint, testType);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("AI import parse failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> createTest(@RequestBody Map<String, Object> request) {
        try {
            Map<String, Object> result = aiBridgeService.importCreateTest(request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("AI import create failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/status/{taskId}")
    public ResponseEntity<?> getStatus(@PathVariable String taskId) {
        try {
            Map<String, Object> result = aiBridgeService.importGetStatus(taskId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("taskId", taskId, "status", "UNKNOWN"));
        }
    }
}
