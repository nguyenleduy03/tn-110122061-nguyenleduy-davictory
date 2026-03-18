package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.RegisterRequest;
import com.victory.DAVictory.dto.UserDTO;
import com.victory.DAVictory.entity.Role;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.entity.Center;
import com.victory.DAVictory.entity.Class;
import com.victory.DAVictory.entity.ClassStudent;
import com.victory.DAVictory.entity.ClassTeacher;
import com.victory.DAVictory.entity.StudentProfile;
import com.victory.DAVictory.repository.RoleRepository;
import com.victory.DAVictory.repository.UserRepository;
import com.victory.DAVictory.repository.ClassRepository;
import com.victory.DAVictory.repository.CenterRepository;
import com.victory.DAVictory.repository.ClassStudentRepository;
import com.victory.DAVictory.repository.ClassTeacherRepository;
import com.victory.DAVictory.repository.StudentProfileRepository;
import com.victory.DAVictory.repository.TeacherProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final CenterRepository centerRepository;
    private final ClassRepository classRepository;
    private final ClassTeacherRepository classTeacherRepository;
    private final ClassStudentRepository classStudentRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final TeacherProfileRepository teacherProfileRepository;

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
        if (userDTO.getEmail() != null && !userDTO.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(userDTO.getEmail())) {
                throw new RuntimeException("Email đã tồn tại");
            }
            user.setEmail(userDTO.getEmail());
        }
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
        List<String> warnings = new ArrayList<>();
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
                    String cohortCode = parts[5].trim();
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

                    User savedUser = userRepository.save(user);

                    // Lưu thông tin profile học viên để đảm bảo không mất trường cohort1
                    StudentProfile profile = studentProfileRepository.findByUserId(savedUser.getId())
                            .orElseGet(StudentProfile::new);
                    profile.setUser(savedUser);
                    profile.setStudentCode(username);
                    if (profile.getEnrollmentDate() == null) {
                        profile.setEnrollmentDate(LocalDate.now());
                    }
                    if (cohortCode != null && !cohortCode.isBlank()) {
                        String currentNotes = profile.getNotes();
                        String cohortNote = "Imported cohort1: " + cohortCode;
                        profile.setNotes(currentNotes == null || currentNotes.isBlank()
                                ? cohortNote
                                : currentNotes + "\n" + cohortNote);
                    }
                    studentProfileRepository.save(profile);

                    // Nếu cohort1 trùng mã lớp thì tự động add học viên vào lớp đó
                    if (cohortCode != null && !cohortCode.isBlank()) {
                        Optional<com.victory.DAVictory.entity.Class> clazzOpt = classRepository.findByCode(cohortCode);
                        if (clazzOpt.isPresent()) {
                            com.victory.DAVictory.entity.Class clazz = clazzOpt.get();
                            ClassStudent classStudent = classStudentRepository
                                    .findByClazzIdAndUserId(clazz.getId(), savedUser.getId())
                                    .orElseGet(ClassStudent::new);

                            classStudent.setClazz(clazz);
                            classStudent.setUser(savedUser);
                            classStudent.setStatus("ACTIVE");
                            classStudent.setDroppedAt(null);
                            if (classStudent.getEnrolledAt() == null) {
                                classStudent.setEnrolledAt(LocalDate.now());
                            }
                            if (classStudent.getNotes() == null || classStudent.getNotes().isBlank()) {
                                classStudent.setNotes("Imported from CSV");
                            }
                            classStudentRepository.save(classStudent);
                        } else {
                            warnings.add("Dòng " + lineNumber + ": Không tìm thấy lớp với mã cohort1='" + cohortCode + "' (đã tạo user + profile)");
                        }
                    }

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
        if (!warnings.isEmpty()) {
            result.put("warnings", warnings);
        }

        return result;
    }

    public List<UserDTO> getAllUsers() {
        return getAllUsers(false);
    }

    public List<UserDTO> getAllUsers(boolean includeDeleted) {
        List<User> users = userRepository.findAll().stream()
                .filter(user -> includeDeleted || user.getDeletedAt() == null)
                .collect(Collectors.toList());
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
            Object rawRoles = userData.get("roles");
            List<String> roleNames = rawRoles instanceof List<?> list
                    ? list.stream().map(String::valueOf).toList()
                    : Collections.emptyList();
            
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
    public void deleteUser(String adminUsername, Long userId, String adminPassword) {
        if (adminPassword == null || adminPassword.isBlank()) {
            throw new RuntimeException("Vui lòng nhập mật khẩu admin để xác nhận xóa user");
        }

        User currentAdmin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy admin hiện tại"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        // Xác thực mật khẩu của chính admin đang thao tác
        if (!passwordEncoder.matches(adminPassword, currentAdmin.getPassword())) {
            throw new RuntimeException("Mật khẩu admin không đúng");
        }
        
        // Kiểm tra không được xóa ADMIN cuối cùng
        boolean isAdmin = user.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName()));
        if (isAdmin) {
            long adminCount = userRepository.countByRoleName("ADMIN");
            if (adminCount <= 1) {
                throw new RuntimeException("Không thể xóa Admin cuối cùng trong hệ thống!");
            }
        }

        // Soft delete để tránh lỗi khóa ngoại từ dữ liệu lịch sử
        boolean isTeacher = user.getRoles().stream().anyMatch(r -> "TEACHER".equals(r.getName()));
        if (isTeacher) {
            List<ClassTeacher> activeAssignments = classTeacherRepository.findByUserIdAndIsActiveTrue(userId);
            for (ClassTeacher assignment : activeAssignments) {
                assignment.setIsActive(false);
                assignment.setReleasedAt(LocalDate.now());
            }
            classTeacherRepository.saveAll(activeAssignments);
        }

        boolean isStudent = user.getRoles().stream().anyMatch(r -> "STUDENT".equals(r.getName()));
        if (isStudent) {
            List<ClassStudent> activeEnrollments = classStudentRepository.findByUserIdAndStatus(userId, "ACTIVE");
            for (ClassStudent enrollment : activeEnrollments) {
                enrollment.setStatus("DROPPED");
                enrollment.setDroppedAt(LocalDate.now());
            }
            classStudentRepository.saveAll(activeEnrollments);
        }

        user.setIsActive(false);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Transactional
    public UserDTO restoreUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        user.setDeletedAt(null);
        user.setIsActive(true);
        return convertToDTO(userRepository.save(user));
    }

    public void addStudentsToClass(Long classId, List<Long> studentIds) {
        // Kiểm tra lớp tồn tại
        com.victory.DAVictory.entity.Class clazz = classRepository.findById(classId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học"));
        
        // Thêm từng học viên vào lớp
        for (Long studentId : studentIds) {
            User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học viên ID: " + studentId));
            
            // Kiểm tra học viên đã trong lớp chưa
            boolean exists = classStudentRepository.existsByClazzIdAndUserId(classId, studentId);
            if (!exists) {
                ClassStudent classStudent = new ClassStudent();
                classStudent.setClazz(clazz);
                classStudent.setUser(student);
                classStudent.setStatus("ACTIVE");
                classStudent.setEnrolledAt(java.time.LocalDate.now());
                classStudentRepository.save(classStudent);
            }
        }
    }

    public Map<String, Object> getTeacherClassManagementData() {
        List<User> teacherUsers = userRepository.findByRoleName("TEACHER");
        List<com.victory.DAVictory.entity.Class> classes = classRepository.findAll().stream()
                .filter(c -> Boolean.TRUE.equals(c.getIsActive()))
                .sorted(Comparator.comparing(com.victory.DAVictory.entity.Class::getStartDate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        List<Map<String, Object>> teacherItems = teacherUsers.stream().map(teacher -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", teacher.getId());
            item.put("fullName", teacher.getFullName());
            item.put("email", teacher.getEmail());
            item.put("isActive", teacher.getIsActive());

            String teacherCode = teacherProfileRepository.findByUserId(teacher.getId())
                    .map(tp -> tp.getTeacherCode())
                    .orElse(null);
            item.put("teacherCode", teacherCode);

            List<ClassTeacher> assignments = classTeacherRepository.findByUserIdAndIsActiveTrueOrderByAssignedAtDesc(teacher.getId());
            item.put("classCount", assignments.size());
            item.put("classes", assignments.stream().map(a -> {
                Map<String, Object> classItem = new LinkedHashMap<>();
                classItem.put("id", a.getClazz().getId());
                classItem.put("code", a.getClazz().getCode());
                classItem.put("name", a.getClazz().getName());
                classItem.put("role", a.getRole());
                classItem.put("assignedAt", a.getAssignedAt());
                return classItem;
            }).collect(Collectors.toList()));

            return item;
        }).collect(Collectors.toList());

        List<Map<String, Object>> classItems = classes.stream().map(clazz -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", clazz.getId());
            item.put("code", clazz.getCode());
            item.put("name", clazz.getName());
            item.put("status", clazz.getStatus());
            item.put("startDate", clazz.getStartDate());
            item.put("endDate", clazz.getEndDate());
            item.put("level", clazz.getLevel());
            item.put("targetBand", clazz.getTargetBand());
            item.put("classType", clazz.getClassType());
            item.put("maxStudents", clazz.getMaxStudents());
            item.put("schedule", clazz.getSchedule());
            item.put("roomLocation", clazz.getRoomLocation());
            item.put("notes", clazz.getNotes());
            item.put("activeStudentCount", classStudentRepository.countByClazzIdAndStatus(clazz.getId(), "ACTIVE"));

            List<ClassTeacher> teachers = classTeacherRepository.findByClazzIdAndIsActiveTrueOrderByRole(clazz.getId());
            item.put("teacherCount", teachers.size());
            item.put("teachers", teachers.stream().map(t -> {
                Map<String, Object> tItem = new LinkedHashMap<>();
                tItem.put("id", t.getUser().getId());
                tItem.put("fullName", t.getUser().getFullName());
                tItem.put("email", t.getUser().getEmail());
                tItem.put("role", t.getRole());
                tItem.put("assignedAt", t.getAssignedAt());
                return tItem;
            }).collect(Collectors.toList()));

            List<ClassStudent> activeStudents = classStudentRepository.findByClazzIdAndStatusOrderByEnrolledAtAsc(clazz.getId(), "ACTIVE");
            item.put("students", activeStudents.stream().map(cs -> {
                Map<String, Object> sItem = new LinkedHashMap<>();
                sItem.put("id", cs.getUser().getId());
                sItem.put("fullName", cs.getUser().getFullName());
                sItem.put("email", cs.getUser().getEmail());
                sItem.put("enrolledAt", cs.getEnrolledAt());
                sItem.put("status", cs.getStatus());
                String studentCode = studentProfileRepository.findByUserId(cs.getUser().getId())
                        .map(StudentProfile::getStudentCode)
                        .orElse(null);
                sItem.put("studentCode", studentCode);
                return sItem;
            }).collect(Collectors.toList()));

            return item;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("teachers", teacherItems);
        result.put("classes", classItems);
        return result;
    }

    public Map<String, Object> getClassManagementDataForUser(String username) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        boolean isAdmin = hasRole(currentUser, "ADMIN") || hasRole(currentUser, "MANAGER");
        boolean isTeacher = hasRole(currentUser, "TEACHER");

        if (isAdmin) {
            return getTeacherClassManagementData();
        }
        if (!isTeacher) {
            throw new RuntimeException("Bạn không có quyền truy cập dữ liệu quản lý lớp");
        }

        List<com.victory.DAVictory.entity.Class> classes = classRepository.findActiveClassesByTeacherId(currentUser.getId()).stream()
                .sorted(Comparator.comparing(com.victory.DAVictory.entity.Class::getStartDate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        List<Map<String, Object>> classItems = classes.stream().map(clazz -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", clazz.getId());
            item.put("code", clazz.getCode());
            item.put("name", clazz.getName());
            item.put("status", clazz.getStatus());
            item.put("startDate", clazz.getStartDate());
            item.put("endDate", clazz.getEndDate());
            item.put("level", clazz.getLevel());
            item.put("targetBand", clazz.getTargetBand());
            item.put("classType", clazz.getClassType());
            item.put("maxStudents", clazz.getMaxStudents());
            item.put("schedule", clazz.getSchedule());
            item.put("roomLocation", clazz.getRoomLocation());
            item.put("notes", clazz.getNotes());
            item.put("activeStudentCount", classStudentRepository.countByClazzIdAndStatus(clazz.getId(), "ACTIVE"));

            List<ClassTeacher> teachers = classTeacherRepository.findByClazzIdAndIsActiveTrueOrderByRole(clazz.getId());
            item.put("teacherCount", teachers.size());
            item.put("teachers", teachers.stream().map(t -> {
                Map<String, Object> tItem = new LinkedHashMap<>();
                tItem.put("id", t.getUser().getId());
                tItem.put("fullName", t.getUser().getFullName());
                tItem.put("email", t.getUser().getEmail());
                tItem.put("role", t.getRole());
                tItem.put("assignedAt", t.getAssignedAt());
                return tItem;
            }).collect(Collectors.toList()));

            List<ClassStudent> activeStudents = classStudentRepository.findByClazzIdAndStatusOrderByEnrolledAtAsc(clazz.getId(), "ACTIVE");
            item.put("students", activeStudents.stream().map(cs -> {
                Map<String, Object> sItem = new LinkedHashMap<>();
                sItem.put("id", cs.getUser().getId());
                sItem.put("fullName", cs.getUser().getFullName());
                sItem.put("email", cs.getUser().getEmail());
                sItem.put("enrolledAt", cs.getEnrolledAt());
                sItem.put("status", cs.getStatus());
                String studentCode = studentProfileRepository.findByUserId(cs.getUser().getId())
                        .map(StudentProfile::getStudentCode)
                        .orElse(null);
                sItem.put("studentCode", studentCode);
                return sItem;
            }).collect(Collectors.toList()));

            return item;
        }).collect(Collectors.toList());

        Map<String, Object> teacherInfo = new LinkedHashMap<>();
        teacherInfo.put("id", currentUser.getId());
        teacherInfo.put("fullName", currentUser.getFullName());
        teacherInfo.put("email", currentUser.getEmail());
        teacherInfo.put("teacherCode", teacherProfileRepository.findByUserId(currentUser.getId())
                .map(tp -> tp.getTeacherCode())
                .orElse(null));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("teacher", teacherInfo);
        result.put("teachers", List.of());
        result.put("classes", classItems);
        return result;
    }

    @Transactional
    public Map<String, Object> createClassForAdmin(Map<String, Object> request) {
        String classCode = request.get("classCode") != null ? String.valueOf(request.get("classCode")).trim() : "";
        String className = request.get("className") != null ? String.valueOf(request.get("className")).trim() : "";

        if (classCode.isBlank()) {
            throw new RuntimeException("Mã lớp không được để trống");
        }
        if (className.isBlank()) {
            throw new RuntimeException("Tên lớp không được để trống");
        }
        if (classRepository.existsByCode(classCode)) {
            throw new RuntimeException("Mã lớp đã tồn tại: " + classCode);
        }

        final Long centerId = (request.get("centerId") != null && !String.valueOf(request.get("centerId")).isBlank())
            ? Long.valueOf(String.valueOf(request.get("centerId")))
            : null;

        Center center;
        if (centerId != null) {
            center = centerRepository.findById(centerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy trung tâm với id=" + centerId));
        } else {
            center = centerRepository.findByIsActiveTrueOrderByNameAsc().stream().findFirst()
                .orElseGet(() -> centerRepository.findAll().stream().findFirst()
                    .orElseGet(this::createDefaultCenterForClassCreation));
        }

        Class clazz = new Class();
        clazz.setCenter(center);
        clazz.setCode(classCode);
        clazz.setName(className);
        clazz.setLevel(request.get("level") != null ? String.valueOf(request.get("level")).trim() : null);
        clazz.setTargetBand(request.get("targetBand") != null ? String.valueOf(request.get("targetBand")).trim() : null);
        clazz.setClassType(request.get("classType") != null ? String.valueOf(request.get("classType")).trim() : "OFFLINE");
        clazz.setMaxStudents(parseIntegerOrNull(request.get("maxStudents")));
        clazz.setSchedule(request.get("schedule") != null ? String.valueOf(request.get("schedule")).trim() : null);
        clazz.setRoomLocation(request.get("roomLocation") != null ? String.valueOf(request.get("roomLocation")).trim() : null);
        clazz.setNotes(request.get("notes") != null ? String.valueOf(request.get("notes")).trim() : null);
        clazz.setStatus(request.get("status") != null ? String.valueOf(request.get("status")).trim() : "UPCOMING");

        clazz.setStartDate(parseDateOrDefault(request.get("startDate"), LocalDate.now()));
        clazz.setEndDate(parseDateOrNull(request.get("endDate")));
        clazz.setIsActive(true);

        Class saved = classRepository.save(clazz);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Đã tạo lớp thành công");
        result.put("id", saved.getId());
        result.put("code", saved.getCode());
        result.put("name", saved.getName());
        result.put("startDate", saved.getStartDate());
        result.put("status", saved.getStatus());
        result.put("centerId", center.getId());
        result.put("centerName", center.getName());
        return result;
    }

    @Transactional
    public Map<String, Object> assignTeacherToClassByCode(String classCode, Long teacherId, String role, String notes) {
        if (classCode == null || classCode.isBlank()) {
            throw new RuntimeException("Mã lớp không được để trống");
        }
        if (teacherId == null) {
            throw new RuntimeException("Thiếu giáo viên cần phân công");
        }

        com.victory.DAVictory.entity.Class clazz = classRepository.findByCode(classCode.trim())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp với mã: " + classCode));

        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        boolean isTeacher = teacher.getRoles().stream().anyMatch(r -> "TEACHER".equals(r.getName()));
        if (!isTeacher) {
            throw new RuntimeException("User được chọn không có vai trò TEACHER");
        }

        String normalizedRole = Optional.ofNullable(role)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .orElse("MAIN_TEACHER");

        Set<String> validRoles = Set.of("MAIN_TEACHER", "ASSISTANT", "SUBSTITUTE");
        if (!validRoles.contains(normalizedRole)) {
            normalizedRole = "MAIN_TEACHER";
        }

        ClassTeacher assignment = classTeacherRepository.findByClazzIdAndUserId(clazz.getId(), teacherId)
                .orElseGet(ClassTeacher::new);

        assignment.setClazz(clazz);
        assignment.setUser(teacher);
        assignment.setRole(normalizedRole);
        assignment.setAssignedAt(LocalDate.now());
        assignment.setReleasedAt(null);
        assignment.setIsActive(true);
        if (notes != null) {
            assignment.setNotes(notes.trim());
        }

        ClassTeacher saved = classTeacherRepository.save(assignment);

        if ("MAIN_TEACHER".equals(normalizedRole)) {
            classTeacherRepository.findByClazzIdAndRoleAndIsActiveTrue(clazz.getId(), "MAIN_TEACHER")
                    .filter(existingMain -> !existingMain.getId().equals(saved.getId()))
                    .ifPresent(existingMain -> {
                        existingMain.setIsActive(false);
                        existingMain.setReleasedAt(LocalDate.now());
                        classTeacherRepository.save(existingMain);
                    });
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Đã phân công giáo viên thành công");
        result.put("classCode", clazz.getCode());
        result.put("className", clazz.getName());
        result.put("teacherId", teacher.getId());
        result.put("teacherName", teacher.getFullName());
        result.put("role", saved.getRole());
        return result;
    }

    @Transactional
    public Map<String, Object> assignStudentListToClassByCode(String classCode, List<String> studentCodeList, String notes) {
        if (classCode == null || classCode.isBlank()) {
            throw new RuntimeException("Mã lớp không được để trống");
        }
        if (studentCodeList == null || studentCodeList.isEmpty()) {
            throw new RuntimeException("Danh sách mã học viên không được để trống");
        }

        com.victory.DAVictory.entity.Class clazz = classRepository.findByCode(classCode.trim())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp với mã: " + classCode));

        return assignStudentListInternal(clazz, studentCodeList, notes);
    }

    @Transactional
    public Map<String, Object> assignStudentListToClassByCodeForUser(String username, String classCode, List<String> studentCodeList, String notes) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        boolean isAdmin = hasRole(currentUser, "ADMIN");
        boolean isTeacher = hasRole(currentUser, "TEACHER");

        if (!isAdmin && !isTeacher) {
            throw new RuntimeException("Bạn không có quyền bàn giao học viên");
        }

        if (classCode == null || classCode.isBlank()) {
            throw new RuntimeException("Mã lớp không được để trống");
        }
        if (studentCodeList == null || studentCodeList.isEmpty()) {
            throw new RuntimeException("Danh sách mã học viên không được để trống");
        }

        com.victory.DAVictory.entity.Class clazz = classRepository.findByCode(classCode.trim())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp với mã: " + classCode));

        if (!isAdmin) {
            ClassTeacher assignment = classTeacherRepository.findByClazzIdAndUserId(clazz.getId(), currentUser.getId())
                    .orElseThrow(() -> new RuntimeException("Bạn không được phép quản lý lớp này"));
            if (!Boolean.TRUE.equals(assignment.getIsActive())) {
                throw new RuntimeException("Bạn không còn được phân công quản lý lớp này");
            }
        }

        return assignStudentListInternal(clazz, studentCodeList, notes);
    }

    private Map<String, Object> assignStudentListInternal(com.victory.DAVictory.entity.Class clazz, List<String> studentCodeList, String notes) {
        if (studentCodeList == null || studentCodeList.isEmpty()) {
            throw new RuntimeException("Danh sách mã học viên không được để trống");
        }

        Set<String> normalizedCodes = studentCodeList.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        int success = 0;
        List<String> failedCodes = new ArrayList<>();
        List<String> messages = new ArrayList<>();

        for (String code : normalizedCodes) {
            User student = studentProfileRepository.findByStudentCode(code)
                    .map(sp -> sp.getUser())
                    .or(() -> userRepository.findByUsername(code))
                    .orElse(null);

            if (student == null) {
                failedCodes.add(code);
                messages.add("Không tìm thấy học viên với mã/username: " + code);
                continue;
            }

            boolean isStudent = student.getRoles().stream().anyMatch(r -> "STUDENT".equals(r.getName()));
            if (!isStudent) {
                failedCodes.add(code);
                messages.add("User không có vai trò STUDENT: " + code);
                continue;
            }

            ClassStudent classStudent = classStudentRepository.findByClazzIdAndUserId(clazz.getId(), student.getId())
                    .orElseGet(ClassStudent::new);

            classStudent.setClazz(clazz);
            classStudent.setUser(student);
            classStudent.setStatus("ACTIVE");
            classStudent.setDroppedAt(null);
            if (classStudent.getEnrolledAt() == null) {
                classStudent.setEnrolledAt(LocalDate.now());
            }
            if (notes != null && !notes.isBlank()) {
                classStudent.setNotes(notes.trim());
            }

            classStudentRepository.save(classStudent);
            success++;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Đã bàn giao danh sách học viên vào lớp");
        result.put("classCode", clazz.getCode());
        result.put("className", clazz.getName());
        result.put("success", success);
        result.put("failed", failedCodes.size());
        result.put("failedCodes", failedCodes);
        result.put("messages", messages);
        return result;
    }

    @Transactional
    public Map<String, Object> updateClassInfoForAdmin(String username, Long classId, Map<String, Object> request) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));
        if (!hasRole(currentUser, "ADMIN")) {
            throw new RuntimeException("Chỉ ADMIN mới được sửa thông tin lớp");
        }

        com.victory.DAVictory.entity.Class clazz = classRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp với id=" + classId));

        if (request.containsKey("name")) {
            String name = request.get("name") != null ? String.valueOf(request.get("name")).trim() : "";
            if (name.isBlank()) {
                throw new RuntimeException("Tên lớp không được để trống");
            }
            clazz.setName(name);
        }

        if (request.containsKey("status")) {
            String status = request.get("status") != null ? String.valueOf(request.get("status")).trim() : "";
            clazz.setStatus(status.isBlank() ? clazz.getStatus() : status);
        }

        if (request.containsKey("startDate")) {
            clazz.setStartDate(parseDateOrDefault(request.get("startDate"), clazz.getStartDate() != null ? clazz.getStartDate() : LocalDate.now()));
        }
        if (request.containsKey("endDate")) {
            clazz.setEndDate(parseDateOrNull(request.get("endDate")));
        }

        if (request.containsKey("level")) clazz.setLevel(stringOrNull(request.get("level")));
        if (request.containsKey("targetBand")) clazz.setTargetBand(stringOrNull(request.get("targetBand")));
        if (request.containsKey("classType")) clazz.setClassType(stringOrNull(request.get("classType")));
        if (request.containsKey("maxStudents")) clazz.setMaxStudents(parseIntegerOrNull(request.get("maxStudents")));
        if (request.containsKey("schedule")) clazz.setSchedule(stringOrNull(request.get("schedule")));
        if (request.containsKey("roomLocation")) clazz.setRoomLocation(stringOrNull(request.get("roomLocation")));
        if (request.containsKey("notes")) clazz.setNotes(stringOrNull(request.get("notes")));

        com.victory.DAVictory.entity.Class saved = classRepository.save(clazz);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Đã cập nhật thông tin lớp");
        result.put("id", saved.getId());
        result.put("code", saved.getCode());
        result.put("name", saved.getName());
        result.put("status", saved.getStatus());
        result.put("startDate", saved.getStartDate());
        result.put("endDate", saved.getEndDate());
        return result;
    }

    @Transactional
    public Map<String, Object> deleteClassForAdmin(String username, Long classId, String password) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));
        if (!hasRole(currentUser, "ADMIN")) {
            throw new RuntimeException("Chỉ ADMIN mới được xóa lớp");
        }

        if (password == null || password.isBlank()) {
            throw new RuntimeException("Vui lòng nhập mật khẩu admin để xác nhận xóa lớp");
        }
        if (!passwordEncoder.matches(password, currentUser.getPassword())) {
            throw new RuntimeException("Mật khẩu admin không đúng");
        }

        com.victory.DAVictory.entity.Class clazz = classRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp với id=" + classId));

        List<ClassTeacher> teacherAssignments = classTeacherRepository.findByClazzIdAndIsActiveTrueOrderByRole(classId);
        for (ClassTeacher assignment : teacherAssignments) {
            assignment.setIsActive(false);
            assignment.setReleasedAt(LocalDate.now());
            if (assignment.getNotes() == null || assignment.getNotes().isBlank()) {
                assignment.setNotes("Đã gỡ phân công do xóa lớp bởi ADMIN");
            }
        }
        classTeacherRepository.saveAll(teacherAssignments);

        List<ClassStudent> activeStudents = classStudentRepository.findByClazzIdAndStatusOrderByEnrolledAtAsc(classId, "ACTIVE");
        for (ClassStudent student : activeStudents) {
            student.setStatus("DROPPED");
            student.setDroppedAt(LocalDate.now());
            if (student.getDropReason() == null || student.getDropReason().isBlank()) {
                student.setDropReason("Lớp đã bị xóa bởi ADMIN");
            }
        }
        classStudentRepository.saveAll(activeStudents);

        if (clazz.getAssignments() != null) {
            for (com.victory.DAVictory.entity.Assignment assignment : clazz.getAssignments()) {
                assignment.setIsActive(false);
                if (assignment.getStatus() == null || !"CLOSED".equalsIgnoreCase(assignment.getStatus())) {
                    assignment.setStatus("CLOSED");
                }
            }
        }

        clazz.setIsActive(false);
        clazz.setStatus("CANCELLED");
        classRepository.save(clazz);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Đã xóa lớp thành công");
        result.put("id", clazz.getId());
        result.put("code", clazz.getCode());
        result.put("name", clazz.getName());
        result.put("releasedTeachers", teacherAssignments.size());
        result.put("droppedStudents", activeStudents.size());
        return result;
    }

    private String stringOrNull(Object value) {
        if (value == null) return null;
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setAvatar(user.getAvatar());
        dto.setIsActive(user.getIsActive());
        dto.setLastLogin(user.getLastLogin());
        dto.setDeletedAt(user.getDeletedAt());
        dto.setCreatedAt(user.getCreatedAt());

        // Profile fields (ưu tiên student profile cho learner dashboard)
        if (user.getStudentProfile() != null) {
            dto.setBirthday(user.getStudentProfile().getDateOfBirth());
            dto.setNationality(user.getStudentProfile().getCountry());
            dto.setStudyLevel(user.getStudentProfile().getCurrentLevel());
            dto.setTargetBand(user.getStudentProfile().getTargetBand());
            dto.setBio(user.getStudentProfile().getNotes());
        } else if (user.getTeacherProfile() != null) {
            // fallback cho teacher: dùng một số field tương đương
            dto.setBio(user.getTeacherProfile().getBio());
            dto.setStudyLevel(user.getTeacherProfile().getEducation());
            dto.setTargetBand(user.getTeacherProfile().getIeltsScore());
        }

        dto.setRoles(user.getRoles().stream()
                .map(role -> role.getName().toString())
                .collect(Collectors.toList()));
        return dto;
    }

    private boolean hasRole(User user, String roleName) {
        if (user == null || user.getRoles() == null) return false;
        return user.getRoles().stream().anyMatch(r -> roleName.equals(r.getName()));
    }

    private Integer parseIntegerOrNull(Object value) {
        if (value == null) return null;
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) return null;
        try {
            return Integer.valueOf(text);
        } catch (NumberFormatException e) {
            throw new RuntimeException("Giá trị số không hợp lệ: " + text);
        }
    }

    private LocalDate parseDateOrDefault(Object value, LocalDate defaultValue) {
        LocalDate parsed = parseDateOrNull(value);
        return parsed != null ? parsed : defaultValue;
    }

    private LocalDate parseDateOrNull(Object value) {
        if (value == null) return null;
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) return null;
        try {
            return LocalDate.parse(text);
        } catch (Exception e) {
            throw new RuntimeException("Định dạng ngày không hợp lệ, cần yyyy-MM-dd: " + text);
        }
    }

    private Center createDefaultCenterForClassCreation() {
        Center center = new Center();
        center.setCode("DEFAULT-CENTER");
        center.setName("Trung tâm mặc định");
        center.setAddress("N/A");
        center.setCity("N/A");
        center.setProvince("N/A");
        center.setIsActive(true);
        return centerRepository.save(center);
    }
}

