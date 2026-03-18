package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.FullTestProgressResponse;
import com.victory.DAVictory.dto.FullTestProgressSaveRequest;
import com.victory.DAVictory.service.FullTestProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/full-test-progress")
@RequiredArgsConstructor
public class FullTestProgressController {

    private final FullTestProgressService fullTestProgressService;

    @PutMapping("/{testId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> saveProgress(@PathVariable Long testId,
                                          @RequestBody FullTestProgressSaveRequest request,
                                          Authentication authentication) {
        try {
            String username = authentication.getName();
            FullTestProgressResponse response = fullTestProgressService.saveProgress(username, testId, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{testId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getProgress(@PathVariable Long testId, Authentication authentication) {
        try {
            String username = authentication.getName();
            FullTestProgressResponse response = fullTestProgressService.getProgress(username, testId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getMyInProgress(Authentication authentication) {
        try {
            String username = authentication.getName();
            List<FullTestProgressResponse> list = fullTestProgressService.getMyInProgress(username);
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{testId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> clearProgress(@PathVariable Long testId, Authentication authentication) {
        try {
            String username = authentication.getName();
            fullTestProgressService.clearProgress(username, testId);
            return ResponseEntity.ok(Map.of("cleared", true));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
