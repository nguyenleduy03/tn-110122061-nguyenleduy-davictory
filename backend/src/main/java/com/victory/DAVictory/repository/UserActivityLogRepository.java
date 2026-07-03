package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.entity.UserActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    long countByActionAndCreatedAtBetween(String action, LocalDateTime startDate, LocalDateTime endDate);

    @Query("SELECT FUNCTION('DATE', l.createdAt) AS date, COUNT(l) AS cnt FROM UserActivityLog l WHERE l.action = :action AND l.createdAt BETWEEN :from AND :to GROUP BY FUNCTION('DATE', l.createdAt) ORDER BY date ASC")
    List<Object[]> countByActionAndCreatedAtBetweenGroupByDate(@Param("action") String action, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
