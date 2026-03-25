package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.WritingSubmitRequest;
import com.victory.DAVictory.dto.WritingSubmissionResponse;
import com.victory.DAVictory.security.JwtUtil;
import com.victory.DAVictory.service.WritingService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/student-writing")
@RequiredArgsConstructor
public class StudentWritingController {

    private final WritingService writingService;
    private final JwtUtil jwtUtil;

    /**
     * Endpoint dự phòng cho nộp writing khi môi trường production chặn path
     * /api/writing/submit.
     */
    @PostMapping("/submit")
    public ResponseEntity<?> submitWriting(
            @RequestBody WritingSubmitRequest request,
            HttpServletRequest httpRequest) {
        try {
            String jwt = extractJwtFromRequest(httpRequest);
            if (!StringUtils.hasText(jwt) || !jwtUtil.validateToken(jwt)) {
                return ResponseEntity.status(401).body(Map.of("error", "Token không hợp lệ hoặc đã hết hạn"));
            }

            String username = jwtUtil.extractUsername(jwt);
            if (!StringUtils.hasText(username)) {
                return ResponseEntity.status(401).body(Map.of("error", "Không xác định được người dùng từ token"));
            }

            WritingSubmissionResponse response = writingService.submitWriting(username, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private String extractJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
