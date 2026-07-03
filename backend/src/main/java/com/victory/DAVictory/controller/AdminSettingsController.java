package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.SystemConfig;
import com.victory.DAVictory.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
public class AdminSettingsController {

    private final SystemConfigRepository configRepo;

    private static final List<String> PUBLIC_KEYS = List.of(
            "site_name", "site_description", "maintenance_mode", "contact_email",
            "contact_phone", "max_upload_size", "default_timezone", "logo_url"
    );

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllSettings() {
        try {
            List<SystemConfig> configs = configRepo.findAll();
            List<SystemConfig> filtered = configs.stream()
                    .filter(c -> PUBLIC_KEYS.contains(c.getConfigKey()))
                    .collect(Collectors.toList());

            if (filtered.isEmpty()) {
                filtered = createDefaultConfigs();
            }

            List<Map<String, Object>> result = filtered.stream()
                    .map(c -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("key", c.getConfigKey());
                        m.put("value", c.getConfigValue());
                        m.put("description", c.getDescription());
                        m.put("updatedAt", c.getUpdatedAt() != null ? c.getUpdatedAt().toString() : null);
                        return m;
                    })
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private List<SystemConfig> createDefaultConfigs() {
        Map<String, String> defaults = new LinkedHashMap<>();
        defaults.put("site_name", "DAVictory");
        defaults.put("site_description", "Hệ thống luyện thi IELTS trực tuyến");
        defaults.put("maintenance_mode", "false");
        defaults.put("contact_email", "admin@davictory.vn");
        defaults.put("contact_phone", "0900000000");
        defaults.put("max_upload_size", "50");
        defaults.put("default_timezone", "Asia/Ho_Chi_Minh");
        defaults.put("logo_url", "");

        List<SystemConfig> list = new ArrayList<>();
        for (Map.Entry<String, String> e : defaults.entrySet()) {
            SystemConfig cfg = new SystemConfig();
            cfg.setConfigKey(e.getKey());
            cfg.setConfigValue(e.getValue());
            cfg.setDescription("");
            configRepo.save(cfg);
            list.add(cfg);
        }
        return list;
    }

    @GetMapping("/{key}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getSetting(@PathVariable String key) {
        try {
            SystemConfig config = configRepo.findByConfigKey(key)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy cấu hình: " + key));
            return ResponseEntity.ok(Map.of(
                    "key", config.getConfigKey(),
                    "value", config.getConfigValue(),
                    "description", config.getDescription()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateSetting(@PathVariable String key, @RequestBody Map<String, String> body) {
        try {
            SystemConfig config = configRepo.findByConfigKey(key)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy cấu hình: " + key));
            String newValue = body.get("value");
            if (newValue != null) {
                config.setConfigValue(newValue);
            }
            if (body.containsKey("description")) {
                config.setDescription(body.get("description"));
            }
            configRepo.save(config);
            return ResponseEntity.ok(Map.of(
                    "message", "Cập nhật thành công",
                    "key", key,
                    "value", config.getConfigValue()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
