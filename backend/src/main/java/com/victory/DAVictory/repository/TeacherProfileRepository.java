package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.TeacherProfile;
import com.victory.DAVictory.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherProfileRepository extends JpaRepository<TeacherProfile, Long> {
    
    Optional<TeacherProfile> findByUser(User user);
    
    Optional<TeacherProfile> findByUserId(Long userId);
    
    Optional<TeacherProfile> findByTeacherCode(String teacherCode);
    
    List<TeacherProfile> findByIsAvailable(Boolean isAvailable);
    
    List<TeacherProfile> findBySpecialization(String specialization);
    
    boolean existsByTeacherCode(String teacherCode);
}
