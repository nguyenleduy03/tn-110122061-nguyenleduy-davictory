package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.StudentProfile;
import com.victory.DAVictory.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    
    Optional<StudentProfile> findByUser(User user);
    
    Optional<StudentProfile> findByUserId(Long userId);
    
    Optional<StudentProfile> findByStudentCode(String studentCode);
    
    boolean existsByStudentCode(String studentCode);
}
