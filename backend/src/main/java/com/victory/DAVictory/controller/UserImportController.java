package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.UserDTO;
import com.victory.DAVictory.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class UserImportController {

    private final UserService userService;

    /**
     * Lấy tất cả người dùng (chỉ Admin)
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        try {
            List<UserDTO> users = userService.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi lấy danh sách người dùng: " + e.getMessage()));
        }
    }

    /**
     * Toggle trạng thái active của user
     */
    @PutMapping("/{userId}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> toggleUserActive(@PathVariable Long userId) {
        try {
            UserDTO user = userService.toggleUserActive(userId);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi thay đổi trạng thái: " + e.getMessage()));
        }
    }

    /**
     * Admin đổi mật khẩu cho user
     */
    @PutMapping("/{userId}/admin-change-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adminChangePassword(@PathVariable Long userId, @RequestBody Map<String, String> request) {
        try {
            String newPassword = request.get("newPassword");
            if (newPassword == null || newPassword.length() < 6) {
                return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu phải có ít nhất 6 ký tự"));
            }
            
            userService.adminChangePassword(userId, newPassword);
            return ResponseEntity.ok(Map.of("message", "Đã đổi mật khẩu thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi đổi mật khẩu: " + e.getMessage()));
        }
    }

    /**
     * Cập nhật thông tin user (Admin)
     */
    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable Long userId, @RequestBody Map<String, Object> request) {
        try {
            UserDTO user = userService.updateUser(userId, request);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi cập nhật: " + e.getMessage()));
        }
    }

    /**
     * Xóa user (Admin)
     */
    @DeleteMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        try {
            userService.deleteUser(userId);
            return ResponseEntity.ok(Map.of("message", "Đã xóa người dùng thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi xóa người dùng: " + e.getMessage()));
        }
    }

    /**
     * Import học viên từ file CSV
     * Format: username,firstname,lastname,email,password,cohort
     */
    @PostMapping("/import-students")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> importStudentsFromCSV(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "File không được để trống"));
            }

            if (!file.getOriginalFilename().toLowerCase().endsWith(".csv")) {
                return ResponseEntity.badRequest().body(Map.of("message", "Chỉ chấp nhận file CSV"));
            }

            Map<String, Object> result = userService.importStudentsFromCSV(file);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi xử lý file: " + e.getMessage()));
        }
    }

    /**
     * Admin lấy dữ liệu quản lý giảng viên và lớp học
     */
    @GetMapping("/teacher-class-management")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getTeacherClassManagement() {
        try {
            return ResponseEntity.ok(userService.getTeacherClassManagementData());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi tải dữ liệu quản lý lớp: " + e.getMessage()));
        }
    }

    /**
     * Admin phân công giáo viên quản lý lớp theo mã lớp
     */
    @PostMapping("/assign-teacher-by-class-code")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignTeacherByClassCode(@RequestBody Map<String, Object> request) {
        try {
            String classCode = request.get("classCode") != null ? String.valueOf(request.get("classCode")) : null;
            Long teacherId = request.get("teacherId") != null ? Long.valueOf(String.valueOf(request.get("teacherId"))) : null;
            String role = request.get("role") != null ? String.valueOf(request.get("role")) : null;
            String notes = request.get("notes") != null ? String.valueOf(request.get("notes")) : null;

            return ResponseEntity.ok(userService.assignTeacherToClassByCode(classCode, teacherId, role, notes));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi phân công giáo viên: " + e.getMessage()));
        }
    }

    /**
     * Admin bàn giao danh sách học viên vào lớp theo mã lớp + danh sách mã học viên
     */
    @PostMapping("/assign-students-by-class-code")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignStudentsByClassCode(@RequestBody Map<String, Object> request) {
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

            return ResponseEntity.ok(userService.assignStudentListToClassByCode(classCode, codes, notes));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi khi bàn giao danh sách học viên: " + e.getMessage()));
        }
    }
}
