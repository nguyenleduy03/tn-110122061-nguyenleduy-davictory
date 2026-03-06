package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.LoginRequest;
import com.victory.DAVictory.dto.RegisterRequest;
import com.victory.DAVictory.dto.UserDTO;
import com.victory.DAVictory.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "API đăng ký, đăng nhập, đăng xuất")
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản mới", description = "Tạo tài khoản học viên mới trong hệ thống")
    public ResponseEntity<UserDTO> register(@RequestBody RegisterRequest request) {
        UserDTO user = userService.registerUser(request);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập", description = "Đăng nhập và nhận token xác thực (chưa implement JWT)")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        try {
            // Tìm user theo username
            UserDTO user = userService.getUserByUsername(request.getUsername());
            
            // TODO: Implement proper password hashing với BCrypt
            // Tạm thời so sánh plain text (KHÔNG AN TOÀN - chỉ dùng cho dev)
            if (!request.getPassword().equals(user.getPassword())) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Tên đăng nhập hoặc mật khẩu không đúng"
                ));
            }
            
            // Kiểm tra tài khoản có active không
            if (!user.getIsActive()) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Tài khoản đã bị khóa"
                ));
            }
            
            // Giả lập token (production cần JWT)
            return ResponseEntity.ok(Map.of(
                "token", "fake-jwt-token-" + user.getId(),
                "user", user
            ));
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of(
                "error", "Tên đăng nhập hoặc mật khẩu không đúng"
            ));
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất", description = "Đăng xuất và hủy session hiện tại")
    public ResponseEntity<Map<String, String>> logout() {
        // TODO: Implement session invalidation
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin user hiện tại", description = "Trả về thông tin user đang đăng nhập (dựa vào token)")
    public ResponseEntity<UserDTO> getCurrentUser() {
        // TODO: Get user from JWT token
        // Tạm thời trả về mock data
        return ResponseEntity.ok(new UserDTO());
    }
}
