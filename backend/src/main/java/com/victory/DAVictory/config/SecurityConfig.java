package com.victory.DAVictory.config;

import com.victory.DAVictory.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true) // Bật @PreAuthorize
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth

                        // ===== CORS PREFLIGHT — luôn cho phép =====
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // ===== PUBLIC ENDPOINTS (không cần đăng nhập) =====
                        .requestMatchers(
                                "/api/auth/**",
                                "/api/drive/**",
                                "/api/guest/**",
                            "/api/public/test-share/validate",
                                "/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**")
                        .permitAll()

                        // Lấy đề thi public (published) — ai cũng xem được
                        .requestMatchers(HttpMethod.GET, "/api/tests/published").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/tests/{id}")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")

                        // ===== AUTH ENDPOINTS =====
                        // /api/auth/** đã permit all ở trên

                        // ===== USER MANAGEMENT =====
                        // Xem danh sách user: MANAGER, ADMIN
                        .requestMatchers(HttpMethod.GET, "/api/users").hasAnyRole("MANAGER", "ADMIN")
                        // Xem theo role: TEACHER+ (để filter đề thi)
                        .requestMatchers(HttpMethod.GET, "/api/users/role/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        // Xem profile cá nhân: tất cả đã đăng nhập
                        .requestMatchers(HttpMethod.GET, "/api/users/{id}").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/users/username/**").authenticated()
                        // Thêm/xóa role: chỉ ADMIN
                        .requestMatchers(HttpMethod.POST, "/api/users/{id}/roles/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/users/{id}/roles/**").hasRole("ADMIN")
                        // Cập nhật user: ADMIN hoặc chính user đó (kiểm tra thêm bằng @PreAuthorize)
                        .requestMatchers(HttpMethod.PUT, "/api/users/**").authenticated()
                        // Xóa user: chỉ ADMIN
                        .requestMatchers(HttpMethod.DELETE, "/api/users/**").hasRole("ADMIN")
                        // Đăng ký qua UserController (fallback): public
                        .requestMatchers(HttpMethod.POST, "/api/users/register").permitAll()

                        // ===== TEST MANAGEMENT =====
                        // Tạo/cập nhật/xóa đề thi: TEACHER+
                        .requestMatchers(HttpMethod.POST, "/api/tests").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/tests/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/tests/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/tests/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        // Xem đề thi theo trạng thái/tìm kiếm: TEACHER+
                        .requestMatchers(HttpMethod.GET, "/api/tests").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/tests/search").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        // Master sessions (để chọn kỹ năng): authenticated
                        .requestMatchers(HttpMethod.GET, "/api/tests/sessions/master").authenticated()
                        // Xem sessions/parts: STUDENT+
                        .requestMatchers(HttpMethod.GET, "/api/tests/**")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")

                        // ===== TEST SHARE LINKS =====
                        .requestMatchers(HttpMethod.POST, "/api/test-share/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")

                        // ===== TEST BUILDER =====
                        // Link công khai cho guest: chỉ đọc dữ liệu full test (controller tự chặn đề chưa publish)
                        .requestMatchers(HttpMethod.GET, "/api/test-builder/*/full").permitAll()
                        // Cho phép STUDENT tải đề thi để làm bài (chỉ GET)
                        .requestMatchers(HttpMethod.GET, "/api/test-builder/**")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        // Filter và shuffle: TEACHER+
                        .requestMatchers(HttpMethod.POST, "/api/test-builder/filter")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/test-builder/shuffle")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        // TEACHER, MANAGER, ADMIN dùng được test builder (write)
                        .requestMatchers("/api/test-builder/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")

                        // ===== TEST STRUCTURE =====
                        // Xem: public (cho TestBuilder); Tạo/sửa/xóa: TEACHER+
                        .requestMatchers(HttpMethod.GET, "/api/test-structure/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/test-structure/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/test-structure/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/test-structure/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")

                        // ===== QUESTIONS =====
                        // Xem câu hỏi: STUDENT+ (để thi)
                        .requestMatchers(HttpMethod.GET, "/api/questions/**")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        // Tạo/sửa/xóa câu hỏi: TEACHER+
                        .requestMatchers(HttpMethod.POST, "/api/questions/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/questions/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/questions/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")

                        // ===== QUESTION GROUPS =====
                        .requestMatchers(HttpMethod.GET, "/api/question-groups/**")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/question-groups/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/question-groups/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/question-groups/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")

                        // ===== QUESTION TYPES =====
                        .requestMatchers(HttpMethod.GET, "/api/question-types/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/question-types/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/question-types/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/question-types/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")

                        // ===== EXAM ATTEMPTS =====
                        // Student tự thi & xem kết quả của mình
                        .requestMatchers(HttpMethod.POST, "/api/exam-attempts/start")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/exam-attempts/*/submit")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/exam-attempts/*/answers")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/exam-attempts/my")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/exam-attempts/{id}").authenticated()
                        // Xem tất cả attempts: TEACHER+
                        .requestMatchers(HttpMethod.GET, "/api/exam-attempts").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/exam-attempts/status/**")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")

                        // ===== SPEAKING =====
                        .requestMatchers(HttpMethod.POST, "/api/speaking/start")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/speaking/*/submit")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/speaking/*/grade")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/speaking/my/**")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/speaking/pending")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/speaking/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")

                        // ===== WRITING =====
                        // Nộp bài & xem bài của mình: STUDENT+
                        .requestMatchers(HttpMethod.POST, "/api/writing/submit")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/writing/submissions")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/writing/submissions/**")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/writing/teacher/submissions")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/writing/teacher/all-submissions")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        // Chấm bài: TEACHER+
                        .requestMatchers(HttpMethod.POST, "/api/writing/*/grade")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/writing/pending")
                        .hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/writing/prompts/**")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/writing/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")

                        // ===== ANALYTICS =====
                        // Student xem analytics của mình
                        .requestMatchers(HttpMethod.GET, "/api/analytics/student/**")
                        .hasAnyRole("STUDENT", "TEACHER", "MANAGER", "ADMIN")
                        // Teacher/Admin xem tất cả
                        .requestMatchers(HttpMethod.GET, "/api/analytics/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")

                        // ===== MEDIA =====
                        .requestMatchers(HttpMethod.POST, "/api/media/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/media/**").authenticated()

                        // ===== FILE UPLOAD =====
                        .requestMatchers(HttpMethod.GET, "/api/files/preview/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/files/upload").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/files/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")

                        // ===== ADMIN =====
                        .requestMatchers("/api/admin/drive/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // ===== ASSIGNMENTS =====
                        .requestMatchers(HttpMethod.POST, "/api/assignments").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/assignments/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/assignments/**").hasAnyRole("TEACHER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/assignments/**").authenticated()

                        // Tất cả các request còn lại: cần đăng nhập
                        .anyRequest().authenticated())
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
