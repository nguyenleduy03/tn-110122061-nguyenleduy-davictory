package com.victory.DAVictory.controller;

import com.victory.DAVictory.service.GoogleDriveOAuth2Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/drive")
@RequiredArgsConstructor
public class AdminDriveController {

    private final GoogleDriveOAuth2Service driveService;

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        try {
            boolean isAuthorized = driveService.isAuthorized();
            Map<String, Object> response = new HashMap<>();
            response.put("authorized", isAuthorized);
            response.put("message", isAuthorized ? "Google Drive đã được ủy quyền" : "Chưa ủy quyền Google Drive");
            
            if (isAuthorized) {
                Map<String, Object> info = driveService.getDriveInfo();
                response.putAll(info);
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("authorized", false, "message", "Chưa ủy quyền"));
        }
    }

    @GetMapping("/authorize-url")
    public ResponseEntity<?> getAuthorizeUrl() {
        try {
            String authUrl = driveService.getAuthorizationUrl();
            return ResponseEntity.ok(Map.of("url", authUrl));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/revoke")
    public ResponseEntity<?> revokeAccess() {
        try {
            driveService.revokeAccess();
            return ResponseEntity.ok(Map.of("message", "Đã thu hồi quyền truy cập Google Drive"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
