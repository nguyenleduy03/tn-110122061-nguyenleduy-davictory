package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.LoginRequest;
import com.victory.DAVictory.dto.RegisterRequest;
import com.victory.DAVictory.dto.UserDTO;
import com.victory.DAVictory.security.JwtUtil;
import com.victory.DAVictory.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "API đăng ký, đăng nhập, đăng xuất")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản mới", description = "Tạo tài khoản học viên mới. Mật khẩu được mã hóa BCrypt.")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            UserDTO user = userService.registerUser(request);
            return ResponseEntity.ok(Map.of(
                "message", "Đăng ký thành công",
                "user", user
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập", description = "Xác thực và nhận JWT access token + refresh token")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            // Spring Security xác thực username/password (BCrypt so sánh tự động)
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();

            // Sinh JWT
            String accessToken = jwtUtil.generateToken(userDetails);
            String refreshToken = jwtUtil.generateRefreshToken(userDetails);

            // Cập nhật last login
            userService.updateLastLogin(userDetails.getUsername());

            // Lấy thông tin user để trả về
            UserDTO userDTO = userService.getUserByUsername(userDetails.getUsername());

            Map<String, Object> response = new HashMap<>();
            response.put("accessToken", accessToken);
            response.put("refreshToken", refreshToken);
            response.put("tokenType", "Bearer");
            response.put("user", userDTO);

            return ResponseEntity.ok(response);

        } catch (DisabledException e) {
            return ResponseEntity.status(401).body(Map.of("error", "Tài khoản đã bị khóa"));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body(Map.of("error", "Tên đăng nhập hoặc mật khẩu không đúng"));
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất", description = "Đăng xuất (client xóa token phía frontend)")
    public ResponseEntity<?> logout() {
        // JWT là stateless, đăng xuất bằng cách client xóa token
        // Có thể implement token blacklist nếu cần
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công. Vui lòng xóa token phía client."));
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin user hiện tại", description = "Trả về thông tin user đang đăng nhập dựa vào JWT token")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Chưa đăng nhập"));
        }
        UserDTO user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(user);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Làm mới access token", description = "Dùng refresh token để lấy access token mới")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Thiếu refresh token"));
        }
        try {
            if (!jwtUtil.validateToken(refreshToken)) {
                return ResponseEntity.status(401).body(Map.of("error", "Refresh token không hợp lệ hoặc đã hết hạn"));
            }
            String username = jwtUtil.extractUsername(refreshToken);
            UserDTO userDTO = userService.getUserByUsername(username);

            // Load UserDetails để sinh token mới
            org.springframework.security.core.userdetails.User.UserBuilder builder =
                    org.springframework.security.core.userdetails.User.builder()
                            .username(username)
                            .password("") // không cần password ở đây
                            .roles(userDTO.getRoles().toArray(new String[0]));
            UserDetails userDetails = builder.build();

            String newAccessToken = jwtUtil.generateToken(userDetails);
            return ResponseEntity.ok(Map.of(
                "accessToken", newAccessToken,
                "tokenType", "Bearer"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Không thể làm mới token"));
        }
    }

    @PostMapping("/change-password")
    @Operation(summary = "Đổi mật khẩu", description = "Đổi mật khẩu cho user đang đăng nhập")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Chưa đăng nhập"));
        }
        try {
            UserDTO currentUser = userService.getUserByUsername(userDetails.getUsername());
            String oldPassword = request.get("oldPassword");
            String newPassword = request.get("newPassword");
            if (oldPassword == null || newPassword == null || newPassword.length() < 6) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mật khẩu mới phải ít nhất 6 ký tự"));
            }
            userService.changePassword(currentUser.getId(), oldPassword, newPassword);
            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
