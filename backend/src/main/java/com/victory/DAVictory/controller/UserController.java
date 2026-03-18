package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.ChangePasswordRequest;
import com.victory.DAVictory.dto.UserDTO;
import com.victory.DAVictory.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ===== ADMIN: Lấy tất cả users =====
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    // ===== Lấy user theo ID =====
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    // ===== Lấy user theo username =====
    @GetMapping("/username/{username}")
    public ResponseEntity<UserDTO> getUserByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    // ===== ADMIN: Lấy users theo role =====
    @GetMapping("/role/{roleName}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<List<UserDTO>> getUsersByRole(@PathVariable String roleName) {
        return ResponseEntity.ok(userService.getUsersByRoleName(roleName));
    }

    // ===== Cập nhật profile (user tự cập nhật) =====
    @PutMapping("/me")
    public ResponseEntity<?> updateMyProfile(@RequestBody UserDTO userDTO, Authentication authentication) {
        String username = authentication.getName();
        UserDTO currentUser = userService.getUserByUsername(username);
        try {
            UserDTO updated = userService.updateUser(currentUser.getId(), userDTO);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== ADMIN: Cập nhật bất kỳ user =====
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> userData,
                                        Authentication authentication) {
        try {
            // Kiểm tra không được sửa chính mình
            String currentUsername = authentication.getName();
            UserDTO currentUser = userService.getUserByUsername(currentUsername);
            if (currentUser.getId().equals(id)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Không thể chỉnh sửa thông tin của chính mình!"));
            }
            
            UserDTO updated = userService.updateUser(id, userData);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== Đổi mật khẩu =====
    @PutMapping("/me/password")
    public ResponseEntity<?> changeMyPassword(@RequestBody ChangePasswordRequest request,
                                              Authentication authentication) {
        String username = authentication.getName();
        UserDTO currentUser = userService.getUserByUsername(username);
        try {
            userService.changePassword(currentUser.getId(), request.getOldPassword(), request.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== ADMIN: Thêm role cho user =====
    @PostMapping("/{id}/roles/{roleName}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addRoleToUser(@PathVariable Long id, @PathVariable String roleName) {
        try {
            UserDTO updated = userService.addRoleToUser(id, roleName);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== ADMIN: Xóa role của user =====
    @DeleteMapping("/{id}/roles/{roleName}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removeRoleFromUser(@PathVariable Long id, @PathVariable String roleName) {
        try {
            UserDTO updated = userService.removeRoleFromUser(id, roleName);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== ADMIN: Xóa user =====
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, Authentication authentication) {
        try {
            // Kiểm tra không được xóa chính mình
            String currentUsername = authentication.getName();
            UserDTO currentUser = userService.getUserByUsername(currentUsername);
            if (currentUser.getId().equals(id)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Không thể xóa chính mình!"));
            }
            
            userService.deleteUser(id);
            return ResponseEntity.ok(Map.of("message", "Xóa user thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== ADMIN: Thêm học viên vào lớp =====
    @PostMapping("/add-students-to-class")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<?> addStudentsToClass(@RequestBody Map<String, Object> request) {
        try {
            Long classId = Long.valueOf(request.get("classId").toString());
            
            @SuppressWarnings("unchecked")
            List<Object> studentIdsRaw = (List<Object>) request.get("studentIds");
            List<Long> studentIds = studentIdsRaw.stream()
                .map(id -> Long.valueOf(id.toString()))
                .collect(java.util.stream.Collectors.toList());
            
            userService.addStudentsToClass(classId, studentIds);
            return ResponseEntity.ok(Map.of("message", "Đã thêm học viên vào lớp thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
