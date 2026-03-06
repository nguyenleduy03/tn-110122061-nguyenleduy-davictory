package com.victory.DAVictory.service;

import com.victory.DAVictory.entity.Role;
import com.victory.DAVictory.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService {
    
    private final RoleRepository roleRepository;
    
    @Transactional
    public Role createRole(String name, String description) {
        if (roleRepository.existsByName(name)) {
            throw new RuntimeException("Role đã tồn tại: " + name);
        }
        
        Role role = new Role();
        role.setName(name);
        role.setDescription(description);
        return roleRepository.save(role);
    }
    
    public Role getRoleByName(String name) {
        return roleRepository.findByName(name)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy role: " + name));
    }
    
    public Role getRoleById(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy role"));
    }
    
    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }
    
    @Transactional
    public void initializeDefaultRoles() {
        String[] defaultRoles = {"GUEST", "STUDENT", "TEACHER", "MANAGER", "ADMIN"};
        String[] descriptions = {
            "Khách - Người dùng chưa đăng ký",
            "Học viên - Người học IELTS",
            "Giảng viên - Người dạy IELTS",
            "Quản lý - Quản lý hệ thống",
            "Admin - Quản trị viên hệ thống"
        };
        
        for (int i = 0; i < defaultRoles.length; i++) {
            if (!roleRepository.existsByName(defaultRoles[i])) {
                createRole(defaultRoles[i], descriptions[i]);
            }
        }
    }
}
