package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.ShuffleTestRequest;
import com.victory.DAVictory.dto.TestFullResponse;
import com.victory.DAVictory.dto.TestSaveRequest;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.service.TestBuilderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/test-builder")
@RequiredArgsConstructor
public class TestBuilderController {

    private final TestBuilderService testBuilderService;

    /**
     * POST /api/test-builder/save-full
     * Lưu toàn bộ đề thi (tạo mới hoặc cập nhật).
     */
    @PostMapping("/save-full")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> saveFullTest(@RequestBody TestSaveRequest request) {
        try {
            TestFullResponse result = testBuilderService.saveFullTest(request);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/test-builder/{id}/full
     * Tải toàn bộ đề thi bao gồm câu hỏi lồng sâu.
     */
    @GetMapping("/{id}/full")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> loadFullTest(@PathVariable Long id, Authentication authentication) {
        try {
            TestFullResponse result = testBuilderService.loadFullTest(id);
            if (isStudentOnly(authentication) && result.getStatus() != TestStatus.PUBLISHED) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Bạn không có quyền xem đề thi này"));
            }
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/test-builder/shuffle
     * Trộn đề mới từ các đề PUBLISHED.
     */
    @PostMapping("/shuffle")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> shuffleTest(@RequestBody ShuffleTestRequest request) {
        try {
            TestFullResponse result = testBuilderService.shuffleTest(request);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/test-builder
     * GET /api/test-builder?status=DRAFT
     * Lấy danh sách đề thi (tùy chọn lọc theo status).
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getAllTests(@RequestParam(required = false) TestStatus status) {
        try {
            List<TestFullResponse> result;
            if (status != null) {
                result = testBuilderService.getTestsByStatus(status);
            } else {
                result = testBuilderService.getAllTests();
            }
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * DELETE /api/test-builder/{id}
     * Xóa đề thi (soft delete → status = DELETED).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> deleteTest(@PathVariable Long id) {
        try {
            testBuilderService.deleteTest(id);
            return ResponseEntity.ok(Map.of("message", "Đã xóa đề thi"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private boolean isStudentOnly(Authentication authentication) {
        if (authentication == null) return false;
        boolean isStudent = hasRole(authentication, "STUDENT");
        boolean isStaff = hasRole(authentication, "TEACHER")
                || hasRole(authentication, "MANAGER")
                || hasRole(authentication, "ADMIN");
        return isStudent && !isStaff;
    }

    private boolean hasRole(Authentication authentication, String role) {
        String target = "ROLE_" + role;
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (target.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
