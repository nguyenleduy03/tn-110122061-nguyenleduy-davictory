package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Nhóm 11 - QUẢN LÝ TRUNG TÂM
 * Bảng class_teachers: giáo viên phụ trách lớp học
 * Một lớp có thể có nhiều giáo viên (chính, phụ, trợ giảng)
 */
@Entity
@Table(name = "class_teachers",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_class_teacher",
                columnNames = {"class_id", "user_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClassTeacher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private Class clazz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Giáo viên

    @Column(nullable = false, length = 20)
    private String role;
    // MAIN_TEACHER, ASSISTANT, SUBSTITUTE (thay thế)

    @Column(nullable = false)
    private LocalDate assignedAt; // Ngày được phân công

    @Column
    private LocalDate releasedAt; // Ngày kết thúc phân công (null = đang dạy)

    @Column(nullable = false)
    private Boolean isActive = true;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
