package com.victory.DAVictory.controller;

import com.victory.DAVictory.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/class-management")
@RequiredArgsConstructor
public class ClassManagementController {

    private final UserService userService;

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'TEACHER')")
    public ResponseEntity<?> getMyClassManagement(Authentication authentication) {
        try {
            return ResponseEntity.ok(userService.getClassManagementDataForUser(authentication.getName()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi tải dữ liệu quản lý lớp: " + e.getMessage()));
        }
    }

    @PostMapping("/assign-students-by-class-code")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'TEACHER')")
    public ResponseEntity<?> assignStudentsByClassCode(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            String classCode = request.get("classCode") != null ? String.valueOf(request.get("classCode")) : null;
            String notes = request.get("notes") != null ? String.valueOf(request.get("notes")) : null;

            List<String> codes = new ArrayList<>();
            Object codeList = request.get("studentCodes");
            if (codeList instanceof List<?> list) {
                for (Object c : list) {
                    if (c != null) {
                        codes.add(String.valueOf(c));
                    }
                }
            }

            return ResponseEntity.ok(userService.assignStudentListToClassByCodeForUser(authentication.getName(), classCode, codes, notes));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi bàn giao danh sách học viên: " + e.getMessage()));
        }
    }

    @PutMapping("/classes/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<?> updateClassInfo(@PathVariable Long classId,
                                             @RequestBody Map<String, Object> request,
                                             Authentication authentication) {
        try {
            return ResponseEntity.ok(userService.updateClassInfoForAdmin(authentication.getName(), classId, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi cập nhật lớp: " + e.getMessage()));
        }
    }

    @DeleteMapping("/classes/{classId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteClass(@PathVariable Long classId,
                                        @RequestBody Map<String, String> request,
                                        Authentication authentication) {
        try {
            String password = request != null ? request.get("password") : null;
            return ResponseEntity.ok(userService.deleteClass(authentication.getName(), classId, password));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
