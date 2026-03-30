package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.ClassStudent;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.repository.ClassStudentRepository;
import com.victory.DAVictory.repository.UserRepository;
import com.victory.DAVictory.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/class-management")
@RequiredArgsConstructor
public class ClassManagementController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final ClassStudentRepository classStudentRepository;

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'TEACHER')")
    public ResponseEntity<?> getMyClassManagement(Authentication authentication) {
        try {
            return ResponseEntity.ok(userService.getClassManagementDataForUser(authentication.getName()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi tải dữ liệu quản lý lớp: " + e.getMessage()));
        }
    }

    @GetMapping("/student/my-classes")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getMyClasses(Authentication authentication) {
        try {
            User student = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            List<ClassStudent> classStudents = classStudentRepository.findByUserIdOrderByEnrolledAtDesc(student.getId());
            List<Map<String, Object>> classes = classStudents.stream()
                    .filter(cs -> "ACTIVE".equals(cs.getStatus()))
                    .map(cs -> {
                        Map<String, Object> classMap = new java.util.HashMap<>();
                        classMap.put("id", cs.getClazz().getId());
                        classMap.put("name", cs.getClazz().getName());
                        classMap.put("code", cs.getClazz().getCode());
                        return classMap;
                    })
                    .collect(Collectors.toList());
            
            Map<String, Object> response = new java.util.HashMap<>();
            response.put("classes", classes);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new java.util.HashMap<>();
            errorResponse.put("message", "Lỗi khi tải danh sách lớp: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
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

    @DeleteMapping("/classes/{classId}/students/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'TEACHER')")
    public ResponseEntity<?> removeStudentFromClass(@PathVariable Long classId,
                                                     @PathVariable Long studentId,
                                                     Authentication authentication) {
        try {
            return ResponseEntity.ok(userService.removeStudentFromClass(authentication.getName(), classId, studentId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
