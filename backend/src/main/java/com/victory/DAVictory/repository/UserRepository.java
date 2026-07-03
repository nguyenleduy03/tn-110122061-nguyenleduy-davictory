package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmail(String email);
    
    List<User> findByIsActive(Boolean isActive);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
    
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName")
    List<User> findByRoleName(@Param("roleName") String roleName);
    
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.isActive = true")
    List<User> findActiveByRoleName(@Param("roleName") String roleName);
    
    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.name = :roleName")
    long countByRoleName(@Param("roleName") String roleName);

    long countByDeletedAtIsNull();

    long countByDeletedAtIsNullAndIsActiveTrue();

    long countByDeletedAtIsNotNull();

    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE u.deletedAt IS NULL AND r.name = :roleName")
    long countActiveByRoleName(@Param("roleName") String roleName);

    long countByDeletedAtIsNullAndLastLoginBetween(LocalDateTime start, LocalDateTime end);

    long countByDeletedAtIsNullAndCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT FUNCTION('DATE', u.createdAt) AS date, COUNT(u) AS cnt FROM User u WHERE u.deletedAt IS NULL AND u.createdAt BETWEEN :from AND :to GROUP BY FUNCTION('DATE', u.createdAt) ORDER BY date ASC")
    List<Object[]> countRegistrationsByDate(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT FUNCTION('DATE', u.lastLogin) AS date, COUNT(u) AS cnt FROM User u WHERE u.deletedAt IS NULL AND u.lastLogin IS NOT NULL AND u.lastLogin BETWEEN :from AND :to GROUP BY FUNCTION('DATE', u.lastLogin) ORDER BY date ASC")
    List<Object[]> countLoginsByDate(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
    
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.id = :roleId")
    List<User> findByRoleId(@Param("roleId") Long roleId);
}
