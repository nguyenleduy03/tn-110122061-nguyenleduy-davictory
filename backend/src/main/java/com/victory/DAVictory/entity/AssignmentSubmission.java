package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 11 - QUẢN LÝ TRUNG TÂM
 * Bảng assignment_submissions: bài nộp của học viên cho từng bài tập
 * (bảng bổ sung hỗ trợ Assignment — không nằm trong yêu cầu ban đầu nhưng cần thiết)
 */
@Entity
@Table(name = "assignment_submissions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_assignment_user",
                columnNames = {"assignment_id", "user_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Học viên nộp bài

    @Column(columnDefinition = "TEXT")
    private String submissionText; // Nội dung bài nộp (text)

    @Column(length = 500)
    private String attachmentUrl; // File đính kèm của học viên

    @Column
    private LocalDateTime submittedAt; // Thời điểm nộp

    @Column(nullable = false, length = 20)
    private String status;
    // NOT_SUBMITTED, SUBMITTED, LATE, GRADED, RETURNED

    @Column
    private Double score; // Điểm giáo viên chấm

    @Column(columnDefinition = "TEXT")
    private String feedback; // Nhận xét của giáo viên

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by")
    private User gradedBy;

    @Column
    private LocalDateTime gradedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
