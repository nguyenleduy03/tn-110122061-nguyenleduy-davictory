package com.victory.DAVictory.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Service tự động lấy IP public của server khi khởi động.
 * Được dùng bởi CorsConfig để build danh sách allowed origins động.
 */
@Slf4j
@Getter
@Component
public class PublicIpService {

    private String publicIp = "localhost"; // fallback mặc định

    @PostConstruct
    public void init() {
        publicIp = fetchPublicIp();
        log.info("🌐 Public IP đã phát hiện: {}", publicIp);
    }

    private String fetchPublicIp() {
        // Thử các service theo thứ tự
        String[] services = {
            "https://api.ipify.org",
            "https://icanhazip.com",
            "https://api4.my-ip.io/ip"
        };

        HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

        for (String serviceUrl : services) {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(serviceUrl))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    String ip = response.body().trim();
                    // Validate IP: chỉ chứa số và dấu chấm (IPv4)
                    if (ip.matches("^\\d{1,3}(\\.\\d{1,3}){3}$")) {
                        log.info("✅ Lấy IP từ {}: {}", serviceUrl, ip);
                        return ip;
                    }
                }
            } catch (Exception e) {
                log.warn("⚠️  Không thể lấy IP từ {}: {}", serviceUrl, e.getMessage());
            }
        }

        // Fallback: thử đọc IP từ network interface local
        try {
            Process process = Runtime.getRuntime().exec("hostname -I");
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line = reader.readLine();
            if (line != null && !line.isBlank()) {
                String localIp = line.trim().split("\\s+")[0];
                log.warn("🔁 Fallback về IP local: {}", localIp);
                return localIp;
            }
        } catch (Exception e) {
            log.warn("⚠️  Không thể đọc IP local: {}", e.getMessage());
        }

        log.warn("🔁 Fallback về localhost");
        return "localhost";
    }
}
