package com.victory.DAVictory.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/admin/system")
@RequiredArgsConstructor
public class AdminSystemHealthController {

    private final DataSource dataSource;

    @GetMapping("/health")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getSystemHealth() {
        try {
            Map<String, Object> health = new LinkedHashMap<>();
            health.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            health.put("status", "UP");

            Map<String, Object> db = checkDatabase();
            health.put("database", db);

            Map<String, Object> system = new LinkedHashMap<>();
            system.put("javaVersion", System.getProperty("java.version"));
            system.put("osName", System.getProperty("os.name"));
            system.put("osArch", System.getProperty("os.arch"));
            system.put("availableProcessors", Runtime.getRuntime().availableProcessors());
            system.put("freeMemory", formatBytes(Runtime.getRuntime().freeMemory()));
            system.put("totalMemory", formatBytes(Runtime.getRuntime().totalMemory()));
            system.put("maxMemory", formatBytes(Runtime.getRuntime().maxMemory()));
            health.put("system", system);

            return ResponseEntity.ok(health);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "status", "DOWN",
                    "error", e.getMessage(),
                    "timestamp", LocalDateTime.now().toString()
            ));
        }
    }

    @GetMapping("/health/database")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getDatabaseDetail() {
        try {
            return ResponseEntity.ok(checkDatabase());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> checkDatabase() throws Exception {
        Map<String, Object> db = new LinkedHashMap<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            db.put("status", "CONNECTED");
            db.put("url", meta.getURL());
            db.put("username", meta.getUserName());
            db.put("databaseProductName", meta.getDatabaseProductName());
            db.put("databaseProductVersion", meta.getDatabaseProductVersion());
            db.put("driverName", meta.getDriverName());
            db.put("driverVersion", meta.getDriverVersion());

            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = 'DAVictory'")) {
                if (rs.next()) {
                    db.put("tableCount", rs.getInt("total"));
                }
            }
        }
        return db;
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024));
        return String.format("%.2f GB", bytes / (1024.0 * 1024 * 1024));
    }
}
