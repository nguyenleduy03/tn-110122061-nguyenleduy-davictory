package com.victory.DAVictory.config;

import com.victory.DAVictory.entity.Role;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.repository.RoleRepository;
import com.victory.DAVictory.repository.UserRepository;
import com.victory.DAVictory.service.RoleService;
import com.victory.DAVictory.service.TestStructureService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleService roleService;
    private final TestStructureService testStructureService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    private static final String DEFAULT_PASSWORD = "davictory";

    @Override
    public void run(String... args) throws Exception {
        log.info("========== BẮT ĐẦU KHỞI TẠO DỮ LIỆU MẶC ĐỊNH ==========");
        
        // 1. Khởi tạo roles mặc định
        roleService.initializeDefaultRoles();
        log.info("✓ Đã khởi tạo roles mặc định");

        // 2. Khởi tạo các tài khoản mặc định
        initializeDefaultUsers();
        log.info("✓ Đã khởi tạo users mặc định");

        // 3. Khởi tạo cấu trúc bài thi IELTS
        testStructureService.initializeDifficultyLevels();
        log.info("✓ Đã khởi tạo difficulty levels");

        testStructureService.initializeSessions();
        log.info("✓ Đã khởi tạo sessions (Academic & General)");

        testStructureService.initializeParts();
        log.info("✓ Đã khởi tạo parts cho các sessions");
        
        log.info("========== HOÀN THÀNH KHỞI TẠO DỮ LIỆU ==========");
        printDefaultAccounts();
    }

    /**
     * Khởi tạo các tài khoản mặc định
     * Username = Role, Password = davictory
     */
    private void initializeDefaultUsers() {
        log.info(">>> Khởi tạo tài khoản mặc định...");
        
        // Admin
        createUserIfNotExists(
            "admin",
            "admin@davictory.com",
            DEFAULT_PASSWORD,
            "Administrator",
            "0123456789",
            "ADMIN"
        );
        
        // Manager
        createUserIfNotExists(
            "manager",
            "manager@davictory.com",
            DEFAULT_PASSWORD,
            "Content Manager",
            "0123456788",
            "MANAGER"
        );
        
        // Teacher
        createUserIfNotExists(
            "teacher",
            "teacher@davictory.com",
            DEFAULT_PASSWORD,
            "Demo Teacher",
            "0123456787",
            "TEACHER"
        );
        
        // Student
        createUserIfNotExists(
            "student",
            "student@davictory.com",
            DEFAULT_PASSWORD,
            "Demo Student",
            "0123456786",
            "STUDENT"
        );
    }

    /**
     * Tạo user nếu chưa tồn tại
     */
    private void createUserIfNotExists(String username, String email, String password,
                                      String fullName, String phoneNumber, String roleName) {
        if (!userRepository.existsByUsername(username)) {
            User user = new User();
            user.setUsername(username);
            user.setEmail(email);
            user.setPassword(password); // TODO: Sẽ mã hóa khi implement Spring Security
            user.setFullName(fullName);
            user.setPhoneNumber(phoneNumber);
            user.setIsActive(true);
            
            // Gán role
            Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy role: " + roleName));
            
            Set<Role> roles = new HashSet<>();
            roles.add(role);
            user.setRoles(roles);
            
            userRepository.save(user);
            log.info("  ✓ Tạo tài khoản: {} (quyền: {})", username, roleName);
        } else {
            log.info("  ○ Tài khoản đã tồn tại: {}", username);
        }
    }

    /**
     * In ra thông tin các tài khoản mặc định
     */
    private void printDefaultAccounts() {
        log.info("\n" +
            "╔════════════════════════════════════════════════════════════╗\n" +
            "║         THÔNG TIN TÀI KHOẢN MẶC ĐỊNH                      ║\n" +
            "╠════════════════════════════════════════════════════════════╣\n" +
            "║  Tài khoản     │ Mật khẩu   │ Quyền                       ║\n" +
            "╠════════════════════════════════════════════════════════════╣\n" +
            "║  admin         │ davictory  │ ADMIN (Quản trị viên)       ║\n" +
            "║  manager       │ davictory  │ MANAGER (Quản lý)           ║\n" +
            "║  teacher       │ davictory  │ TEACHER (Giáo viên)         ║\n" +
            "║  student       │ davictory  │ STUDENT (Học viên)          ║\n" +
            "╚════════════════════════════════════════════════════════════╝\n"
        );
    }
}
