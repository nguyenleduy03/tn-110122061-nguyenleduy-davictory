package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    
    Optional<UserSession> findBySessionToken(String sessionToken);
    
    List<UserSession> findByUser(User user);
    
    List<UserSession> findByUserId(Long userId);
    
    List<UserSession> findByUserAndIsActive(User user, Boolean isActive);
    
    List<UserSession> findByUserIdAndIsActive(Long userId, Boolean isActive);
    
    List<UserSession> findByExpiresAtBefore(LocalDateTime dateTime);
    
    void deleteByExpiresAtBefore(LocalDateTime dateTime);
}
