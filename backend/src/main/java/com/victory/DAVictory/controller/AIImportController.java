package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.AIImportResponseDTO;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.exception.AIImportException;
import com.victory.DAVictory.repository.UserRepository;
import com.victory.DAVictory.service.AIBridgeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/ai/import")
@RequiredArgsConstructor
@Slf4j
public class AIImportController {

    private final AIBridgeService aiBridgeService;
    private final UserRepository userRepository;

    @PostMapping("/parse")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> parseDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "skillHint", defaultValue = "") String skillHint,
            @RequestParam(value = "testType", defaultValue = "ACADEMIC") String testType,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new AIImportException("User not found"));
            byte[] content = file.getBytes();
            String filename = file.getOriginalFilename();
            Map<String, Object> result = aiBridgeService.importParseDocument(content, filename, skillHint, testType);
            return ResponseEntity.ok(result);
        } catch (AIImportException e) {
            log.error("AI import parse failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(AIImportResponseDTO.builder()
                    .status("FAILED").error(e.getMessage()).build());
        } catch (Exception e) {
            log.error("AI import parse failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(AIImportResponseDTO.builder()
                    .status("FAILED").error("Parse failed: " + e.getMessage()).build());
        }
    }

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> createTest(@RequestBody Map<String, Object> request,
                                        @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new AIImportException("User not found"));
            request.put("created_by_user_id", currentUser.getId());
            Map<String, Object> result = aiBridgeService.importCreateTest(request);
            return ResponseEntity.ok(result);
        } catch (AIImportException e) {
            log.error("AI import create failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(AIImportResponseDTO.CreateResultDTO.builder()
                    .success(false).message(e.getMessage()).build());
        } catch (Exception e) {
            log.error("AI import create failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(AIImportResponseDTO.CreateResultDTO.builder()
                    .success(false).message("Create failed: " + e.getMessage()).build());
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

    @PostMapping("/vision-extract")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> visionExtract(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "questionType", defaultValue = "") String questionType,
            @RequestParam(value = "skillHint", defaultValue = "") String skillHint,
            @RequestParam(value = "testType", defaultValue = "ACADEMIC") String testType,
            @RequestParam(value = "part", defaultValue = "") String part,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            byte[] content = file.getBytes();
            String filename = file.getOriginalFilename();
            Map<String, Object> result = aiBridgeService.importVisionExtract(
                    content, filename, questionType, skillHint, testType, part);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("AI import vision extract failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("status", "FAILED", "error", e.getMessage()));
        }
    }

    @PostMapping("/format-structure")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> formatStructure(@RequestBody Map<String, Object> request,
                                              @AuthenticationPrincipal UserDetails userDetails) {
        try {
            Map<String, Object> result = aiBridgeService.importFormatStructure(request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("AI import format structure failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("status", "FAILED", "error", e.getMessage()));
        }
    }
}
