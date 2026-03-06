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
@Table(name = "teacher_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeacherProfile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(length = 50)
    private String teacherCode; // Mã giảng viên
    
    @Column(length = 500)
    private String bio; // Giới thiệu
    
    @Column(columnDefinition = "TEXT")
    private String qualifications; // Bằng cấp, chứng chỉ
    
    @Column(length = 100)
    private String specialization; // Chuyên môn (Speaking, Writing, etc.)
    
    @Column
    private Integer yearsOfExperience; // Số năm kinh nghiệm
    
    @Column(length = 20)
    private String ieltsScore; // Điểm IELTS của giảng viên
    
    @Column(length = 100)
    private String education; // Học vấn
    
    @Column(length = 100)
    private String university; // Trường đại học
    
    @Column
    private LocalDate joinDate; // Ngày gia nhập
    
    @Column(length = 50)
    private String employmentType; // Full-time, Part-time, Freelance
    
    @Column(nullable = false)
    private Boolean isAvailable = true; // Sẵn sàng nhận lớp
    
    @Column
    private Double hourlyRate; // Lương theo giờ
    
    @Column(columnDefinition = "TEXT")
    private String teachingStyle; // Phong cách giảng dạy
    
    @Column(columnDefinition = "TEXT")
    private String certifications; // Các chứng chỉ khác
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
