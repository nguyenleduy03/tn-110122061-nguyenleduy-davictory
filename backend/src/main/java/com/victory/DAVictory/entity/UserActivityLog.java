package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_activity_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserActivityLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false, length = 50)
    private String action; // LOGIN, LOGOUT, REGISTER, UPDATE_PROFILE, START_TEST, SUBMIT_TEST, etc.
    
    @Column(length = 100)
    private String module; // User, Test, Course, etc.
    
    @Column(columnDefinition = "TEXT")
    private String description; // Mô tả chi tiết hành động
    
    @Column(length = 50)
    private String ipAddress;
    
    @Column(length = 255)
    private String userAgent;
    
    @Column(length = 100)
    private String deviceType;
    
    @Column(columnDefinition = "TEXT")
    private String requestData; // JSON data của request (nếu có)
    
    @Column(columnDefinition = "TEXT")
    private String responseData; // JSON data của response (nếu có)
    
    @Column(length = 20)
    private String status; // SUCCESS, FAILED, ERROR
    
    @Column(length = 500)
    private String errorMessage; // Thông báo lỗi nếu có
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
