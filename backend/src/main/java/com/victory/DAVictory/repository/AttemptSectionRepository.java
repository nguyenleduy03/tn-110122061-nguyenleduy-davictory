package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.AttemptSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttemptSectionRepository extends JpaRepository<AttemptSection, Long> {

    List<AttemptSection> findByExamAttemptIdOrderByOrderIndexAsc(Long examAttemptId);

    Optional<AttemptSection> findByExamAttemptIdAndPartId(Long examAttemptId, Long partId);

    // Các section theo trạng thái
    List<AttemptSection> findByExamAttemptIdAndStatus(Long examAttemptId, String status);

    // Section đang làm dở
    Optional<AttemptSection> findByExamAttemptIdAndStatusOrderByOrderIndexAsc(Long examAttemptId, String status);
}
