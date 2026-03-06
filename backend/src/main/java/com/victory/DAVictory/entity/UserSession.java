package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSession {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false, unique = true, length = 255)
    private String sessionToken; // JWT token hoặc session ID
    
    @Column(length = 50)
    private String ipAddress;
    
    @Column(length = 255)
    private String userAgent; // Browser, device info
    
    @Column(length = 100)
    private String deviceType; // Desktop, Mobile, Tablet
    
    @Column(length = 100)
    private String location; // Vị trí đăng nhập
    
    @Column(nullable = false)
    private Boolean isActive = true;
    
    @Column(nullable = false)
    private LocalDateTime loginAt;
    
    @Column
    private LocalDateTime logoutAt;
    
    @Column
    private LocalDateTime expiresAt; // Thời gian hết hạn session
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
