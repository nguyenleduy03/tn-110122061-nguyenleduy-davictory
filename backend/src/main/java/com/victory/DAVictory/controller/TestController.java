package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.TestRequest;
import com.victory.DAVictory.dto.TestResponse;
import com.victory.DAVictory.entity.Test;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.enums.TestType;
import com.victory.DAVictory.service.TestManagementService;
import com.victory.DAVictory.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
public class TestController {

    private final TestManagementService testManagementService;
    private final UserService userService;

    // ========== TẠO ĐỀ THI ==========

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> createTest(@RequestBody TestRequest request,
                                        @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userService.getUserEntityByUsername(userDetails.getUsername());

            Test test = new Test();
            test.setTitle(request.getTitle());
            test.setDescription(request.getDescription());
            test.setTestType(request.getTestType() != null ? request.getTestType() : TestType.ACADEMIC);
            test.setIsFullTest(request.getIsFullTest() != null ? request.getIsFullTest() : true);
            test.setDurationMinutes(request.getDurationMinutes());
            test.setTargetBand(request.getTargetBand());

            Test savedTest = testManagementService.createTest(test, currentUser.getId());
            return ResponseEntity.ok(TestResponse.fromEntity(savedTest));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ========== LẤY DANH SÁCH ĐỀ THI ==========

    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getTests(
            @RequestParam(required = false) TestStatus status,
            @RequestParam(required = false) TestType testType,
            @RequestParam(required = false) String keyword) {
        try {
            List<Test> tests;

            if (keyword != null && !keyword.isBlank()) {
                tests = testManagementService.searchTests(keyword);
            } else if (status != null) {
                tests = testManagementService.getTestsByStatus(status);
            } else if (testType != null) {
                tests = testManagementService.getTestsByStatus(TestStatus.PUBLISHED).stream()
                        .filter(t -> t.getTestType() == testType)
                        .collect(Collectors.toList());
            } else {
                tests = testManagementService.getAllTests();
            }

            // Loại bỏ đề đã xóa (trừ khi filter theo DELETED)
            if (status != TestStatus.DELETED) {
                tests = tests.stream()
                        .filter(t -> t.getStatus() != TestStatus.DELETED)
                        .collect(Collectors.toList());
            }

            List<TestResponse> response = tests.stream()
                    .map(TestResponse::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ========== ĐỀ THI PUBLISHED (PUBLIC) ==========

    @GetMapping("/published")
    public ResponseEntity<?> getPublishedTests(@RequestParam(required = false) TestType testType) {
        try {
            List<Test> tests = testManagementService.getPublishedTests(testType);
            List<TestResponse> response = tests.stream()
                    .map(TestResponse::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ========== ĐỀ THI CỦA TÔI ==========

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getMyTests(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userService.getUserEntityByUsername(userDetails.getUsername());
            List<Test> tests = testManagementService.getTestsByCreator(currentUser.getId());
            List<TestResponse> response = tests.stream()
                    .filter(t -> t.getStatus() != TestStatus.DELETED)
                    .map(TestResponse::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ========== XEM CHI TIẾT ĐỀ THI ==========

    @GetMapping("/{id}")
    public ResponseEntity<?> getTestById(@PathVariable Long id) {
        try {
            Test test = testManagementService.getTestById(id);
            return ResponseEntity.ok(TestResponse.fromEntity(test));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ========== CẬP NHẬT ĐỀ THI ==========

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> updateTest(@PathVariable Long id,
                                        @RequestBody TestRequest request) {
        try {
            Test updatedTest = testManagementService.updateTest(
                    id,
                    request.getTitle(),
                    request.getDescription(),
                    request.getTestType(),
                    request.getIsFullTest(),
                    request.getDurationMinutes(),
                    request.getTargetBand()
            );
            return ResponseEntity.ok(TestResponse.fromEntity(updatedTest));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ========== THAY ĐỔI TRẠNG THÁI ĐỀ THI ==========

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> updateTestStatus(@PathVariable Long id,
                                              @RequestParam TestStatus status,
                                              @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userService.getUserEntityByUsername(userDetails.getUsername());
            Test updatedTest = testManagementService.updateTestStatus(id, status, currentUser.getId());
            return ResponseEntity.ok(TestResponse.fromEntity(updatedTest));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ========== XÓA ĐỀ THI (SOFT DELETE) ==========

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> deleteTest(@PathVariable Long id) {
        try {
            testManagementService.deleteTest(id);
            return ResponseEntity.ok(Map.of("message", "Đã xóa đề thi (soft delete)"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
