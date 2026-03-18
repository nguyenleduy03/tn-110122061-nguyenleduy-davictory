package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.ClassStudent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassStudentRepository extends JpaRepository<ClassStudent, Long> {

    Optional<ClassStudent> findByClazzIdAndUserId(Long classId, Long userId);

    boolean existsByClazzIdAndUserId(Long classId, Long userId);

    // Tất cả học viên của lớp
    List<ClassStudent> findByClazzIdOrderByEnrolledAtAsc(Long classId);

    // Học viên đang học trong lớp
    List<ClassStudent> findByClazzIdAndStatusOrderByEnrolledAtAsc(Long classId, String status);

    // Tất cả lớp của học viên
    List<ClassStudent> findByUserIdOrderByEnrolledAtDesc(Long userId);

    // Lớp đang học của học viên
    List<ClassStudent> findByUserIdAndStatus(Long userId, String status);

    long countByClazzIdAndStatus(Long classId, String status);

    @Query("SELECT cs.user.id FROM ClassStudent cs WHERE cs.clazz.id IN :classIds AND cs.status = 'ACTIVE'")
    List<Long> findStudentIdsByClassIds(@Param("classIds") List<Long> classIds);

    @Modifying
    @Query("DELETE FROM ClassStudent cs WHERE cs.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    // Kiểm tra học viên có trong lớp không
    boolean existsByUserIdAndClazzId(Long userId, Long classId);
}
