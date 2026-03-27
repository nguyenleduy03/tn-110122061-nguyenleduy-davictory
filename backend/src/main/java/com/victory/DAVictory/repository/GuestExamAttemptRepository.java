package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.GuestExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface GuestExamAttemptRepository extends JpaRepository<GuestExamAttempt, Long> {
    List<GuestExamAttempt> findByEmailOrderByCreatedAtDesc(String email);
    long countByEmailAndCreatedAtAfter(String email, LocalDateTime after);
}
