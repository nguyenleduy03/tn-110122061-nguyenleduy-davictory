package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.AuthResponse;
import com.victory.DAVictory.dto.LoginRequest;
import com.victory.DAVictory.dto.RegisterRequest;
import com.victory.DAVictory.dto.UserDTO;
import com.victory.DAVictory.security.JwtUtil;
import com.victory.DAVictory.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            UserDTO user = userService.registerUser(request);
            return ResponseEntity.ok(Map.of(
                "message", "Đăng ký thành công",
                "user", user
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String accessToken = jwtUtil.generateToken(userDetails);
            String refreshToken = jwtUtil.generateRefreshToken(userDetails);

            // Cập nhật lastLogin
            userService.updateLastLogin(request.getUsername());

            // Lấy thông tin user
            UserDTO userDTO = userService.getUserByUsername(request.getUsername());

            return ResponseEntity.ok(new AuthResponse(accessToken, refreshToken, userDTO));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body(Map.of(
                "error", "Tên đăng nhập hoặc mật khẩu không đúng"
            ));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Chưa đăng nhập"));
        }
        String username = authentication.getName();
        UserDTO user = userService.getUserByUsername(username);
        return ResponseEntity.ok(user);
    }
}
