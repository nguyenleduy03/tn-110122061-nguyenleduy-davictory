package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.ClassTeacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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
    List<ClassTeacher> findByClazzIdAndRoleAndIsActiveTrueOrderByAssignedAtDesc(Long classId, String role);

    // Tất cả lớp của giáo viên
    List<ClassTeacher> findByUserIdAndIsActiveTrueOrderByAssignedAtDesc(Long userId);

    // Lấy tất cả lớp mà teacher đang dạy
    @Query("SELECT ct.clazz.id FROM ClassTeacher ct WHERE ct.user.id = :teacherId AND ct.isActive = true")
    List<Long> findClassIdsByTeacherId(@Param("teacherId") Long teacherId);

    List<ClassTeacher> findByUserIdAndIsActiveTrue(Long userId);

    @Modifying
    @Query("DELETE FROM ClassTeacher ct WHERE ct.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    // Kiểm tra GV có dạy lớp này không
    boolean existsByUserIdAndClazzIdAndIsActiveTrue(Long userId, Long classId);

    // Kiểm tra GV có dạy bất kỳ lớp nào trong danh sách không
    @Query("SELECT CASE WHEN COUNT(ct) > 0 THEN true ELSE false END FROM ClassTeacher ct " +
           "WHERE ct.user.id = :userId AND ct.clazz.id IN :classIds AND ct.isActive = true")
    boolean existsByUserIdAndClazzIdInAndIsActiveTrue(@Param("userId") Long userId, @Param("classIds") List<Long> classIds);
}
