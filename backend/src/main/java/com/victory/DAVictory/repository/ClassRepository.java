package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Class;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassRepository extends JpaRepository<Class, Long> {

    Optional<Class> findByCode(String code);

    boolean existsByCode(String code);

    List<Class> findByCenterIdAndIsActiveTrueOrderByStartDateDesc(Long centerId);

    List<Class> findByStatusAndIsActiveTrue(String status);

    List<Class> findByCenterIdAndStatusAndIsActiveTrue(Long centerId, String status);

    // Lớp học của một giáo viên (qua ClassTeacher)
    @Query("SELECT c FROM Class c JOIN c.classTeachers ct " +
           "WHERE ct.user.id = :teacherId AND ct.isActive = true AND c.isActive = true")
    List<Class> findActiveClassesByTeacherId(@Param("teacherId") Long teacherId);

    // Lớp học của một học viên (qua ClassStudent)
    @Query("SELECT c FROM Class c JOIN c.classStudents cs " +
           "WHERE cs.user.id = :studentId AND cs.status = 'ACTIVE' AND c.isActive = true")
    List<Class> findActiveClassesByStudentId(@Param("studentId") Long studentId);

    // Đếm học viên đang học trong lớp
    @Query("SELECT COUNT(cs) FROM ClassStudent cs WHERE cs.clazz.id = :classId AND cs.status = 'ACTIVE'")
    long countActiveStudents(@Param("classId") Long classId);
}
