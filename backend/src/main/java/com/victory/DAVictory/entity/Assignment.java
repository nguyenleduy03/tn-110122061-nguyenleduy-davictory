package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Nhóm 11 - QUẢN LÝ TRUNG TÂM
 * Bảng assignments: bài tập giáo viên giao cho lớp
 */
@Entity
@Table(name = "assignments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private Class clazz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy; // Giáo viên giao bài

    @Column(nullable = false, length = 200)
    private String title; // Tiêu đề bài tập

    @Column(columnDefinition = "TEXT")
    private String description; // Mô tả / yêu cầu chi tiết

    @Column(name = "assignment_type", length = 30)
    private String type = "MANUAL"; // TEST hoặc MANUAL

    @Column(name = "test_id")
    private Long testId; // Link to Test (nếu type = TEST)

    @Column
    private Double maxScore; // Điểm tối đa

    @Column
    private LocalDateTime dueDate; // Hạn nộp bài

    @Column
    private Integer maxAttempts; // Số lần làm tối đa (null = không giới hạn)

    @Column(nullable = false)
    private Boolean allowLateSubmission = false; // Cho phép nộp trễ

    @Column(nullable = false)
    private String status = "DRAFT"; // DRAFT, PUBLISHED, CLOSED

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Bài nộp của từng học viên cho assignment này
    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("submittedAt DESC")
    private List<AssignmentSubmission> submissions = new ArrayList<>();
}
