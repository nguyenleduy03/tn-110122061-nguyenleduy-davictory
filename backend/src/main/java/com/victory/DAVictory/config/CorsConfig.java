package com.victory.DAVictory.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Cấu hình CORS để cho phép frontend gọi API.
 * IP public được lấy tự động lúc khởi động qua PublicIpService.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class CorsConfig {

    private final PublicIpService publicIpService;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        // Cho phép gửi credentials (cookies, authorization headers)
        config.setAllowCredentials(true);

        // Build danh sách allowed origins động
        String publicIp = publicIpService.getPublicIp();
        List<String> allowedOrigins = new ArrayList<>(Arrays.asList(
            "http://localhost:5173",           // Vite dev server
            "http://localhost:3000",           // React dev server
            "http://localhost:80",             // Nginx local
            "http://localhost",                // Nginx local (no port)
            "https://davictory.io.vn",         // Production domain
            "http://davictory.io.vn"           // Production domain (HTTP)
        ));

        // Thêm IP public tự động phát hiện
        if (!"localhost".equals(publicIp)) {
            allowedOrigins.add("http://" + publicIp + ":5173");
            allowedOrigins.add("http://" + publicIp + ":3000");
            allowedOrigins.add("http://" + publicIp + ":80");
            allowedOrigins.add("http://" + publicIp);
            log.info("🔓 CORS: Thêm IP public {} vào allowed origins", publicIp);
        }

        config.setAllowedOrigins(allowedOrigins);
        log.info("✅ CORS allowed origins: {}", allowedOrigins);

        // Các HTTP methods được phép
        config.setAllowedMethods(Arrays.asList(
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS",
            "PATCH"
        ));

        // Các headers được phép
        config.setAllowedHeaders(Arrays.asList(
            "Origin",
            "Content-Type",
            "Accept",
            "Authorization",
            "X-Requested-With",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ));

        // Các headers được expose cho client
        config.setExposedHeaders(Arrays.asList(
            "Authorization",
            "Content-Disposition"
        ));

        // Thời gian cache preflight request (OPTIONS)
        config.setMaxAge(3600L);

        // Áp dụng config cho tất cả các endpoints
        source.registerCorsConfiguration("/**", config);

        return source;
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public CorsFilter corsFilter() {
        return new CorsFilter(corsConfigurationSource());
    }
}

