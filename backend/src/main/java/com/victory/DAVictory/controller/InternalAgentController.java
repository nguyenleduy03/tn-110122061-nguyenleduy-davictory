package com.victory.DAVictory.controller;

import com.victory.DAVictory.service.InternalQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/internal/agent")
@RequiredArgsConstructor
public class InternalAgentController {

    private final InternalQueryService internalQueryService;

    @PostMapping("/query")
    public ResponseEntity<?> query(@RequestBody Map<String, Object> request) {
        String table = (String) request.get("table");
        String role = (String) request.get("user_role");

        if (table == null || table.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing table"));
        }

        try {
            internalQueryService.checkPermission(table, role);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "allowed", true,
                "message", "Permitted"
            ));
        } catch (SecurityException e) {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "allowed", false,
                "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/query/execute")
    public ResponseEntity<?> executeQuery(@RequestBody Map<String, Object> request) {
        String table = (String) request.get("table");
        String role = (String) request.get("user_role");
        String sql = (String) request.get("sql");
        Map<String, Object> params = (Map<String, Object>) request.get("params");
        Integer limit = (Integer) request.get("limit");

        if (table == null || sql == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing table or sql"));
        }

        try {
            var result = internalQueryService.executeQuery(table, sql, params, limit, role);
            return ResponseEntity.ok(Map.of("success", true, "data", result));
        } catch (SecurityException e) {
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
