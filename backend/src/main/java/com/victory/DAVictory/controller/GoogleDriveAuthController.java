package com.victory.DAVictory.controller;

import com.victory.DAVictory.service.GoogleDriveOAuth2Service;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.Map;

@RestController
@RequestMapping("/api/drive")
@RequiredArgsConstructor
public class GoogleDriveAuthController {

    private final GoogleDriveOAuth2Service driveService;

    @Value("${google.drive.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @GetMapping("/authorize")
    public RedirectView authorize() throws Exception {
        String authUrl = driveService.getAuthorizationUrl();
        return new RedirectView(authUrl);
    }

    @GetMapping("/oauth2callback")
    public RedirectView oauth2Callback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "error", required = false) String error) throws Exception {
        if (error != null && !error.isBlank()) {
            String redirectUrl = frontendUrl + "/admin/drive?error=" + error;
            System.out.println("🔀 Redirecting OAuth error to: " + redirectUrl);
            return new RedirectView(redirectUrl);
        }

        if (code == null || code.isBlank()) {
            String redirectUrl = frontendUrl + "/admin/drive?error=missing_code";
            System.out.println("🔀 Redirecting missing code to: " + redirectUrl);
            return new RedirectView(redirectUrl);
        }

        System.out.println("🔄 OAuth callback received with code: " + code.substring(0, Math.min(10, code.length())) + "...");
        driveService.storeCredential(code);
        System.out.println("✅ Credentials stored successfully");

        // Redirect về frontend để hiển thị trạng thái đã ủy quyền
        String redirectUrl = frontendUrl + "/admin/drive?authorized=true";
        System.out.println("🔀 Redirecting to: " + redirectUrl);
        return new RedirectView(redirectUrl);
    }
}
