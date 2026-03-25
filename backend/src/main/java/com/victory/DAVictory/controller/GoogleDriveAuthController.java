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
    public Map<String, String> oauth2Callback(@RequestParam("code") String code) throws Exception {
        driveService.storeCredential(code);
        return Map.of("message", "Authorization successful! You can now upload files.");
    }
}
