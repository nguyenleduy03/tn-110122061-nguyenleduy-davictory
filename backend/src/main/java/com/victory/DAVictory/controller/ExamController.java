package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.CreateExamRequest;
import com.victory.DAVictory.dto.ExamResponse;
import com.victory.DAVictory.dto.VerifyExamPasswordRequest;
import com.victory.DAVictory.repository.UserRepository;
import com.victory.DAVictory.service.ExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> createExam(@RequestBody CreateExamRequest request, Authentication authentication) {
        try {
            ExamResponse response = examService.createExam(request, authentication.getName());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> updateExam(@PathVariable Long id, @RequestBody CreateExamRequest request,
                                        Authentication authentication) {
        try {
            ExamResponse response = examService.updateExam(id, request, authentication.getName());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> deleteExam(@PathVariable Long id, Authentication authentication) {
        try {
            examService.deleteExam(id, authentication.getName());
            return ResponseEntity.ok(Map.of("message", "Đã xoá kỳ thi"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> startExam(@PathVariable Long id, Authentication authentication) {
        try {
            ExamResponse response = examService.startExam(id, authentication.getName());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> closeExam(@PathVariable Long id, Authentication authentication) {
        try {
            ExamResponse response = examService.closeExam(id, authentication.getName());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getExamDetail(@PathVariable Long id, Authentication authentication) {
        try {
            ExamResponse response = examService.getExamDetail(id, authentication.getName());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> listTeacherExams(Authentication authentication) {
        try {
            List<ExamResponse> list = examService.listTeacherExams(authentication.getName());
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/available")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> listAvailableExams(Authentication authentication) {
        try {
            List<ExamResponse> list = examService.listStudentExams(authentication.getName());
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/verify-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> verifyPassword(@PathVariable Long id,
                                            @RequestBody VerifyExamPasswordRequest request,
                                            Authentication authentication) {
        try {
            boolean valid = examService.verifyPassword(id, request.getPassword());
            if (valid) {
                return ResponseEntity.ok(Map.of("valid", true));
            }
            return ResponseEntity.status(401).body(Map.of("error", "Sai mật khẩu"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/check-access")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> checkAccess(@PathVariable Long id, Authentication authentication) {
        try {
            String username = authentication.getName();
            com.victory.DAVictory.entity.User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
            examService.checkStudentCanAccess(id, user.getId());
            return ResponseEntity.ok(Map.of("access", true));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
