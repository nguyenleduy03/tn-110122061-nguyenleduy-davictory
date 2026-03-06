package com.victory.DAVictory.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

/**
 * Cấu hình CORS để cho phép frontend gọi API
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Cho phép gửi credentials (cookies, authorization headers)
        config.setAllowCredentials(true);
        
        // Các origin được phép (localhost cho dev, public IP cho production)
        config.setAllowedOrigins(Arrays.asList(
            "http://localhost:5173",           // Vite dev server
            "http://localhost:3000",           // React dev server
            "http://113.163.208.49:5173",      // Production frontend
            "http://113.163.208.49:3000"       // Production frontend alternative
        ));
        
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
        
        return new CorsFilter(source);
    }
}
