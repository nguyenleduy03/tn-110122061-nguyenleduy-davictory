package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.ExamAttemptResponse;
import com.victory.DAVictory.dto.ExamAttemptGradeHistoryResponse;
import com.victory.DAVictory.dto.ExamAttemptManualGradeRequest;
import com.victory.DAVictory.dto.ExamAttemptStartRequest;
import com.victory.DAVictory.dto.ExamAttemptSubmitRequest;
import com.victory.DAVictory.service.ExamAttemptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exam-attempts")
@RequiredArgsConstructor
public class ExamAttemptController {

    private final ExamAttemptService examAttemptService;

    @PostMapping("/start")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> startAttempt(@RequestBody ExamAttemptStartRequest request,
                                          Authentication authentication) {
        try {
            String username = authentication.getName();
            ExamAttemptResponse response = examAttemptService.startAttempt(username, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{attemptId}/submit")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> submitAttempt(@PathVariable Long attemptId,
                                           @RequestBody ExamAttemptSubmitRequest request,
                                           Authentication authentication) {
        try {
            String username = authentication.getName();
            ExamAttemptResponse response = examAttemptService.submitAttempt(username, attemptId, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getMyAttempts(Authentication authentication) {
        try {
            String username = authentication.getName();
            List<ExamAttemptResponse> list = examAttemptService.getMyAttempts(username);
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getAttempt(@PathVariable Long id, Authentication authentication) {
        try {
            String username = authentication.getName();
            ExamAttemptResponse response = examAttemptService.getAttempt(id, username);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getAllAttempts() {
        try {
            List<ExamAttemptResponse> list = examAttemptService.getAllAttempts();
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/class/{classId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getAttemptsByClass(@PathVariable Long classId, Authentication authentication) {
        try {
            String username = authentication.getName();
            List<ExamAttemptResponse> list = examAttemptService.getAttemptsByClass(username, classId);
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/class/{classId}/student/{studentId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getStudentAttempts(@PathVariable Long classId, 
                                                 @PathVariable Long studentId,
                                                 Authentication authentication) {
        try {
            String username = authentication.getName();
            List<ExamAttemptResponse> list = examAttemptService.getStudentAttemptsByClass(username, classId, studentId);
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getAttemptDetailForTeacher(@PathVariable Long id, Authentication authentication) {
        try {
            String username = authentication.getName();
            ExamAttemptResponse response = examAttemptService.getAttemptDetailForTeacher(username, id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/grade")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> updateAttemptGrade(@PathVariable Long id,
                                                @RequestBody ExamAttemptManualGradeRequest request,
                                                Authentication authentication) {
        try {
            String username = authentication.getName();
            ExamAttemptResponse response = examAttemptService.updateAttemptGrade(username, id, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/grade-history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getAttemptGradeHistory(@PathVariable Long id, Authentication authentication) {
        try {
            String username = authentication.getName();
            List<ExamAttemptGradeHistoryResponse> list = examAttemptService.getAttemptGradeHistory(username, id);
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/timeout")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> autoSubmitTimeout(@PathVariable Long id, Authentication authentication) {
        try {
            ExamAttemptResponse response = examAttemptService.autoSubmitTimeout(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/backup")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> backupAnswers(@PathVariable Long id, 
                                           @RequestBody ExamAttemptSubmitRequest request,
                                           Authentication authentication) {
        try {
            String username = authentication.getName();
            examAttemptService.backupAnswers(username, id, request.getAnswers());
            return ResponseEntity.ok(Map.of("message", "Backup thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/filter")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> filterAttempts(@RequestBody com.victory.DAVictory.dto.ExamAttemptFilterRequest filter,
                                            Authentication authentication) {
        try {
            String username = authentication.getName();
            List<ExamAttemptResponse> list = examAttemptService.filterAttempts(username, filter);
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
