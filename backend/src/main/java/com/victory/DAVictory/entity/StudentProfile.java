package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentProfile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(length = 50)
    private String studentCode; // Mã học viên
    
    @Column
    private LocalDate dateOfBirth;
    
    @Column(length = 10)
    private String gender; // Male, Female, Other
    
    @Column(length = 500)
    private String address;
    
    @Column(length = 100)
    private String city;
    
    @Column(length = 100)
    private String country;
    
    @Column(length = 20)
    private String currentLevel; // Beginner, Intermediate, Advanced
    
    @Column(length = 10)
    private String targetBand; // 5.0, 5.5, 6.0, 6.5, 7.0, etc.
    
    @Column
    private LocalDate enrollmentDate; // Ngày đăng ký
    
    @Column(length = 50)
    private String learningGoal; // Academic, General, Immigration
    
    @Column(length = 15)
    private String emergencyContact; // SĐT người thân
    
    @Column(length = 100)
    private String emergencyContactName;
    
    @Column(columnDefinition = "TEXT")
    private String notes; // Ghi chú
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
