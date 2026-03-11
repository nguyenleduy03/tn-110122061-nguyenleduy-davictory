package com.victory.DAVictory.config;

import com.victory.DAVictory.entity.Role;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.repository.RoleRepository;
import com.victory.DAVictory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        initRoles();
        initDefaultUsers();
    }

    private void initRoles() {
        String[][] roles = {
            {"GUEST", "Khách - Người dùng chưa đăng ký"},
            {"STUDENT", "Học viên - Người học IELTS"},
            {"TEACHER", "Giảng viên - Người dạy IELTS"},
            {"MANAGER", "Quản lý - Quản lý hệ thống"},
            {"ADMIN", "Admin - Quản trị viên hệ thống"}
        };

        for (String[] r : roles) {
            if (!roleRepository.existsByName(r[0])) {
                Role role = new Role();
                role.setName(r[0]);
                role.setDescription(r[1]);
                roleRepository.save(role);
                log.info("✅ Tạo role: {}", r[0]);
            }
        }
    }

    private void initDefaultUsers() {
        // 4 users mặc định: admin, manager, teacher, student
        // username = tên quyền (viết thường), password = davictory
        String[][] users = {
            {"admin", "admin@davictory.com", "Quản trị viên", "ADMIN"},
            {"manager", "manager@davictory.com", "Quản lý hệ thống", "MANAGER"},
            {"teacher", "teacher@davictory.com", "Giảng viên IELTS", "TEACHER"},
            {"student", "student@davictory.com", "Học viên IELTS", "STUDENT"}
        };

        String defaultPassword = passwordEncoder.encode("davictory");

        for (String[] u : users) {
            if (!userRepository.existsByUsername(u[0])) {
                User user = new User();
                user.setUsername(u[0]);
                user.setEmail(u[1]);
                user.setFullName(u[2]);
                user.setPassword(defaultPassword);
                user.setIsActive(true);

                Role role = roleRepository.findByName(u[3])
                        .orElseThrow(() -> new RuntimeException("Role not found: " + u[3]));
                Set<Role> roleSet = new HashSet<>();
                roleSet.add(role);
                user.setRoles(roleSet);

                userRepository.save(user);
                log.info("✅ Tạo user: {} (role: {})", u[0], u[3]);
            }
        }
    }
}
