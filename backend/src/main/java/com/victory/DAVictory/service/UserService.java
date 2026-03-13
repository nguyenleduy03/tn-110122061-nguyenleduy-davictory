package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.RegisterRequest;
import com.victory.DAVictory.dto.UserDTO;
import com.victory.DAVictory.entity.Role;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.repository.RoleRepository;
import com.victory.DAVictory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserDTO registerUser(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username đã tồn tại");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword())); // BCrypt
        user.setFullName(request.getFullName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setIsActive(true);

        Role studentRole = roleRepository.findByName("STUDENT")
                .orElseThrow(() -> new RuntimeException("Role STUDENT không tồn tại"));
        Set<Role> roles = new HashSet<>();
        roles.add(studentRole);
        user.setRoles(roles);

        User savedUser = userRepository.save(user);
        return convertToDTO(savedUser);
    }

    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        return convertToDTO(user);
    }

    public UserDTO getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        return convertToDTO(user);
    }

    public User getUserEntityByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
    }

    public List<UserDTO> getUsersByRoleName(String roleName) {
        return userRepository.findByRoleName(roleName).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDTO addRoleToUser(Long userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy role: " + roleName));
        user.getRoles().add(role);
        return convertToDTO(userRepository.save(user));
    }

    @Transactional
    public UserDTO removeRoleFromUser(Long userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy role: " + roleName));
        user.getRoles().remove(role);
        return convertToDTO(userRepository.save(user));
    }

    @Transactional
    public UserDTO updateUser(Long id, UserDTO userDTO) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        if (userDTO.getFullName() != null) user.setFullName(userDTO.getFullName());
        if (userDTO.getPhoneNumber() != null) user.setPhoneNumber(userDTO.getPhoneNumber());
        if (userDTO.getAvatar() != null) user.setAvatar(userDTO.getAvatar());
        if (userDTO.getIsActive() != null) user.setIsActive(userDTO.getIsActive());

        // Cập nhật Profile học viên
        com.victory.DAVictory.entity.StudentProfile profile = user.getStudentProfile();
        if (profile == null) {
            profile = new com.victory.DAVictory.entity.StudentProfile();
            profile.setUser(user);
            user.setStudentProfile(profile);
        }
        if (userDTO.getBirthday() != null) profile.setDateOfBirth(userDTO.getBirthday());
        if (userDTO.getNationality() != null) profile.setCountry(userDTO.getNationality());
        if (userDTO.getStudyLevel() != null) profile.setCurrentLevel(userDTO.getStudyLevel());
        if (userDTO.getTargetBand() != null) profile.setTargetBand(userDTO.getTargetBand());
        if (userDTO.getBio() != null) profile.setNotes(userDTO.getBio());

        return convertToDTO(userRepository.save(user));
    }

    @Transactional
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Mật khẩu cũ không đúng");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void updateLastLogin(String username) {
        userRepository.findByUsername(username).ifPresent(user -> {
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    /**
     * Import học viên từ file CSV
     * Format: username,firstname,lastname,email,password,cohort
     */
    @Transactional
    public Map<String, Object> importStudentsFromCSV(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int failedCount = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            int lineNumber = 0;
            
            // Skip header line
            if ((line = reader.readLine()) != null) {
                lineNumber++;
            }

            Role studentRole = roleRepository.findByName("STUDENT")
                    .orElseThrow(() -> new RuntimeException("Role STUDENT không tồn tại"));

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                
                if (line.trim().isEmpty()) continue;

                try {
                    String[] parts = line.split(",");
                    if (parts.length < 6) {
                        errors.add("Dòng " + lineNumber + ": Thiếu dữ liệu (cần 6 cột)");
                        failedCount++;
                        continue;
                    }

                    String username = parts[0].trim();
                    String firstName = parts[1].trim();
                    String lastName = parts[2].trim();
                    String email = parts[3].trim();
                    String password = parts[4].trim();
                    String cohort = parts[5].trim();

                    // Validate
                    if (username.isEmpty() || email.isEmpty() || password.isEmpty()) {
                        errors.add("Dòng " + lineNumber + ": Username, email và password không được để trống");
                        failedCount++;
                        continue;
                    }

                    // Check duplicates
                    if (userRepository.existsByUsername(username)) {
                        errors.add("Dòng " + lineNumber + ": Username '" + username + "' đã tồn tại");
                        failedCount++;
                        continue;
                    }

                    if (userRepository.existsByEmail(email)) {
                        errors.add("Dòng " + lineNumber + ": Email '" + email + "' đã tồn tại");
                        failedCount++;
                        continue;
                    }

                    // Create user
                    User user = new User();
                    user.setUsername(username);
                    user.setEmail(email);
                    user.setPassword(passwordEncoder.encode(password));
                    user.setFullName(firstName + " " + lastName);
                    user.setIsActive(true);

                    Set<Role> roles = new HashSet<>();
                    roles.add(studentRole);
                    user.setRoles(roles);

                    userRepository.save(user);
                    successCount++;

                } catch (Exception e) {
                    errors.add("Dòng " + lineNumber + ": " + e.getMessage());
                    failedCount++;
                }
            }

        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi đọc file CSV: " + e.getMessage());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", successCount);
        result.put("failed", failedCount);
        result.put("total", successCount + failedCount);
        if (!errors.isEmpty()) {
            result.put("errors", errors);
        }

        return result;
    }

    public List<UserDTO> getAllUsers() {
        List<User> users = userRepository.findAll();
        return users.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional
    public UserDTO toggleUserActive(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        user.setIsActive(!user.getIsActive());
        return convertToDTO(userRepository.save(user));
    }

    @Transactional
    public void adminChangePassword(Long userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public UserDTO updateUser(Long userId, Map<String, Object> userData) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        
        if (userData.containsKey("fullName")) {
            user.setFullName((String) userData.get("fullName"));
        }
        if (userData.containsKey("email")) {
            user.setEmail((String) userData.get("email"));
        }
        if (userData.containsKey("roles")) {
            List<String> roleNames = (List<String>) userData.get("roles");
            
            // Kiểm tra bảo mật: Không được tạo thêm ADMIN
            boolean hasNewAdmin = roleNames.contains("ADMIN") && 
                                 user.getRoles().stream().noneMatch(r -> "ADMIN".equals(r.getName()));
            if (hasNewAdmin) {
                throw new RuntimeException("Không được phép nâng cấp tài khoản lên ADMIN!");
            }
            
            // Kiểm tra không được hạ cấp ADMIN cuối cùng
            boolean isCurrentAdmin = user.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName()));
            boolean willRemoveAdmin = isCurrentAdmin && !roleNames.contains("ADMIN");
            if (willRemoveAdmin) {
                long adminCount = userRepository.countByRoleName("ADMIN");
                if (adminCount <= 1) {
                    throw new RuntimeException("Không thể hạ cấp Admin cuối cùng trong hệ thống!");
                }
            }
            
            Set<Role> roles = new HashSet<>();
            for (String roleName : roleNames) {
                Role role = roleRepository.findByName(roleName)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy role: " + roleName));
                roles.add(role);
            }
            user.setRoles(roles);
        }
        
        return convertToDTO(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        
        // Kiểm tra không được xóa ADMIN cuối cùng
        boolean isAdmin = user.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName()));
        if (isAdmin) {
            long adminCount = userRepository.countByRoleName("ADMIN");
            if (adminCount <= 1) {
                throw new RuntimeException("Không thể xóa Admin cuối cùng trong hệ thống!");
            }
        }
        
        userRepository.delete(user);
    }

    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setIsActive(user.getIsActive());
        dto.setLastLogin(user.getLastLogin());
        dto.setRoles(user.getRoles().stream()
                .map(role -> role.getName().toString())
                .collect(Collectors.toList()));
        return dto;
    }
}

