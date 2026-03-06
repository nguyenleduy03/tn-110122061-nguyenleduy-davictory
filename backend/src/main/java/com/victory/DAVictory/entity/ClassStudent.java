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
 * Bảng class_students: học viên trong lớp học
 */
@Entity
@Table(name = "class_students",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_class_student",
                columnNames = {"class_id", "user_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClassStudent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private Class clazz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Học viên

    @Column(nullable = false)
    private LocalDate enrolledAt; // Ngày nhập học

    @Column
    private LocalDate droppedAt; // Ngày nghỉ học (null = vẫn đang học)

    @Column(length = 20)
    private String status;
    // ACTIVE, DROPPED, COMPLETED, SUSPENDED

    @Column(length = 255)
    private String dropReason; // Lý do nghỉ học

    @Column
    private Double finalBandScore; // Điểm band kết thúc khóa

    @Column(columnDefinition = "TEXT")
    private String notes; // Ghi chú của giáo viên / quản lý

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
