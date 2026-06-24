package com.victory.DAVictory.controller;

import com.victory.DAVictory.service.AgentBridgeService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class UploadProxyController {

    private final AgentBridgeService agentBridgeService;

    @GetMapping("/api/agent/uploads/**")
    public ResponseEntity<Resource> getUpload(HttpServletRequest request) {
        String fullUri = request.getRequestURI();
        String uploadPath = fullUri.substring(fullUri.indexOf("/uploads/"));
        return agentBridgeService.proxyUpload(uploadPath);
    }
}
