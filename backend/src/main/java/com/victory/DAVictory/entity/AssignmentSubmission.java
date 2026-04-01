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
@Table(name = "assignment_submissions")
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

    @Column(nullable = false)
    private Integer attemptNumber = 1; // Lần nộp thứ mấy

    // For MANUAL type
    @Column(columnDefinition = "TEXT")
    private String submissionText; // Nội dung bài nộp

    @Column(length = 500)
    private String attachmentUrl; // File đính kèm

    // For TEST type
    @Column(name = "exam_attempt_id")
    private Long examAttemptId; // Link to ExamAttempt

    @Column
    private LocalDateTime submittedAt; // Thời điểm nộp

    @Column(nullable = false, length = 20)
    private String status = "SUBMITTED"; // SUBMITTED, GRADED

    @Column
    private Double score; // Điểm

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
