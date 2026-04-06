package com.victory.DAVictory.controller;

import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.service.TestShareLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class TestShareLinkController {

    private final TestShareLinkService testShareLinkService;

    @PostMapping("/api/test-share/generate")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> generate(@RequestBody Map<String, Object> payload,
                                      Authentication authentication,
                                      @RequestHeader(value = "Origin", required = false) String origin,
                                      @RequestHeader(value = "Host", required = false) String host,
                                      @RequestHeader(value = "X-Forwarded-Proto", required = false) String forwardedProto) {
        try {
            Long testId = payload.get("testId") == null ? null : Long.parseLong(String.valueOf(payload.get("testId")));
            SkillType skillType = payload.get("skillType") == null ? null : SkillType.valueOf(String.valueOf(payload.get("skillType")).toUpperCase());
            boolean refresh = Boolean.parseBoolean(String.valueOf(payload.getOrDefault("refresh", false)));

            boolean isAdminOrManager = hasRole(authentication, "ADMIN") || hasRole(authentication, "MANAGER");
            String username = authentication != null ? authentication.getName() : null;

            String baseOrigin = resolveBaseOrigin(origin, host, forwardedProto);

            return ResponseEntity.ok(testShareLinkService.generateShareLink(
                    testId,
                    skillType,
                    refresh,
                    username,
                    isAdminOrManager,
                    baseOrigin
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/api/public/test-share/validate")
    public ResponseEntity<?> validate(@RequestParam Long testId,
                                      @RequestParam SkillType skillType,
                                      @RequestParam("token") String token) {
        boolean valid = testShareLinkService.validateShareLink(testId, skillType, token);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("valid", valid);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/test-share/current")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> current(@RequestParam Long testId,
                                     @RequestParam SkillType skillType,
                                     Authentication authentication,
                                     @RequestHeader(value = "Origin", required = false) String origin,
                                     @RequestHeader(value = "Host", required = false) String host,
                                     @RequestHeader(value = "X-Forwarded-Proto", required = false) String forwardedProto) {
        try {
            boolean isAdminOrManager = hasRole(authentication, "ADMIN") || hasRole(authentication, "MANAGER");
            String username = authentication != null ? authentication.getName() : null;
            String baseOrigin = resolveBaseOrigin(origin, host, forwardedProto);
            return ResponseEntity.ok(testShareLinkService.getActiveShareLink(testId, skillType, username, isAdminOrManager, baseOrigin));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/api/test-share/deactivate")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> deactivate(@RequestParam Long testId,
                                        @RequestParam SkillType skillType,
                                        Authentication authentication) {
        try {
            boolean isAdminOrManager = hasRole(authentication, "ADMIN") || hasRole(authentication, "MANAGER");
            String username = authentication != null ? authentication.getName() : null;
            boolean deactivated = testShareLinkService.deactivateShareLink(testId, skillType, username, isAdminOrManager);

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success", deactivated);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private boolean hasRole(Authentication authentication, String role) {
        if (authentication == null) return false;
        String target = "ROLE_" + role;
        return authentication.getAuthorities().stream().anyMatch(a -> target.equals(a.getAuthority()));
    }

    private String resolveBaseOrigin(String origin, String host, String forwardedProto) {
        if (origin != null && !origin.isBlank()) {
            return origin;
        }
        if (host == null || host.isBlank()) {
            return "";
        }
        String proto = (forwardedProto == null || forwardedProto.isBlank()) ? "http" : forwardedProto;
        return proto + "://" + host;
    }
}
