package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.entity.UserActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {
    
    List<UserActivityLog> findByUser(User user);
    
    List<UserActivityLog> findByUserId(Long userId);
    
    List<UserActivityLog> findByAction(String action);
    
    List<UserActivityLog> findByModule(String module);
    
    List<UserActivityLog> findByStatus(String status);
    
    List<UserActivityLog> findByUserIdAndAction(Long userId, String action);
    
    List<UserActivityLog> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    List<UserActivityLog> findByUserIdAndCreatedAtBetween(Long userId, LocalDateTime startDate, LocalDateTime endDate);
}
