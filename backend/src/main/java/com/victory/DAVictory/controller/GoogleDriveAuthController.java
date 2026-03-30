package com.victory.DAVictory.controller;

import com.victory.DAVictory.service.GoogleDriveOAuth2Service;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.Map;

@RestController
@RequestMapping("/api/drive")
@RequiredArgsConstructor
public class GoogleDriveAuthController {

    private final GoogleDriveOAuth2Service driveService;

    @GetMapping("/authorize")
    public RedirectView authorize() throws Exception {
        String authUrl = driveService.getAuthorizationUrl();
        return new RedirectView(authUrl);
    }

    @GetMapping("/oauth2callback")
    public RedirectView oauth2Callback(@RequestParam("code") String code) throws Exception {
        System.out.println("🔄 OAuth callback received with code: " + code.substring(0, 10) + "...");
        driveService.storeCredential(code);
        System.out.println("✅ Credentials stored successfully");
        
        // Redirect về trang Google Drive Settings với thông báo thành công
        String redirectUrl = "/admin/drive?authorized=true";
        System.out.println("🔀 Redirecting to: " + redirectUrl);
        return new RedirectView(redirectUrl);
    }
}
