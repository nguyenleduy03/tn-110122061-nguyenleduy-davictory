package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.ClassTeacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassTeacherRepository extends JpaRepository<ClassTeacher, Long> {

    Optional<ClassTeacher> findByClazzIdAndUserId(Long classId, Long userId);

    boolean existsByClazzIdAndUserId(Long classId, Long userId);

    // Tất cả giáo viên của lớp
    List<ClassTeacher> findByClazzIdAndIsActiveTrueOrderByRole(Long classId);

    // Giáo viên chính của lớp
    Optional<ClassTeacher> findByClazzIdAndRoleAndIsActiveTrue(Long classId, String role);

    // Tất cả lớp của giáo viên
    List<ClassTeacher> findByUserIdAndIsActiveTrueOrderByAssignedAtDesc(Long userId);
}
