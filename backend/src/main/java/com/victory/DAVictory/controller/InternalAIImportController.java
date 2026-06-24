package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.TestFullResponse;
import com.victory.DAVictory.dto.TestSaveRequest;
import com.victory.DAVictory.service.TestBuilderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/internal/ai/import")
@RequiredArgsConstructor
@Slf4j
public class InternalAIImportController {

    private final TestBuilderService testBuilderService;
    private final ObjectMapper objectMapper;

    @PostMapping("/save-test")
    public ResponseEntity<?> saveTest(@RequestBody Map<String, Object> request) {
        try {
            TestSaveRequest saveRequest = objectMapper.convertValue(request, TestSaveRequest.class);
            TestFullResponse result = testBuilderService.saveFullTest(saveRequest);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Internal AI import save test failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
