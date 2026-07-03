package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.AIGradingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AIGradingHistoryRepository extends JpaRepository<AIGradingHistory, Long> {
    List<AIGradingHistory> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<AIGradingHistory> findAllByOrderByCreatedAtDesc();

    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    @Query("SELECT COUNT(h) FROM AIGradingHistory h")
    long countTotal();
}
