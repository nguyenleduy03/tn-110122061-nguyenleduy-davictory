package com.victory.DAVictory.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SwaggerConfig {

    private final PublicIpService publicIpService;

    @Bean
    public OpenAPI customOpenAPI() {
        List<Server> servers = new ArrayList<>();

        // Thêm server theo IP public
        String publicIp = publicIpService.getPublicIp();
        if (!"localhost".equals(publicIp)) {
            Server publicServer = new Server();
            publicServer.setUrl("http://" + publicIp + ":8080");
            publicServer.setDescription("Public Server");
            servers.add(publicServer);
        }

        // Luôn thêm localhost làm fallback
        Server localServer = new Server();
        localServer.setUrl("http://localhost:8080");
        localServer.setDescription("Local Development Server");
        servers.add(localServer);

        Contact contact = new Contact();
        contact.setName("DAVictory Team");
        contact.setEmail("support@davictory.com");

        License license = new License()
                .name("Apache 2.0")
                .url("https://www.apache.org/licenses/LICENSE-2.0.html");

        Info info = new Info()
                .title("DAVictory IELTS API")
                .version("1.0.0")
                .description("""
                        API cho hệ thống thi IELTS online.
                        
                        **Cách dùng:**
                        1. Gọi `POST /api/auth/login` với body `{"username":"admin","password":"davictory"}`
                        2. Copy giá trị `accessToken` từ response
                        3. Nhấn nút **Authorize 🔒** ở trên, nhập `Bearer <token>` vào ô BearerAuth
                        4. Nhấn Authorize — giờ tất cả endpoint có 🔒 sẽ dùng token này
                        """)
                .contact(contact)
                .license(license);

        // Định nghĩa Bearer JWT security scheme
        SecurityScheme bearerScheme = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("Nhập Access Token lấy từ /api/auth/login (không cần thêm 'Bearer ' — tự động thêm)");

        // Áp dụng security toàn cục (mọi endpoint đều yêu cầu xác thực trừ khi override)
        SecurityRequirement securityRequirement = new SecurityRequirement().addList("BearerAuth");

        return new OpenAPI()
                .info(info)
                .servers(servers)
                .addSecurityItem(securityRequirement)
                .components(new Components()
                        .addSecuritySchemes("BearerAuth", bearerScheme));
    }
}
