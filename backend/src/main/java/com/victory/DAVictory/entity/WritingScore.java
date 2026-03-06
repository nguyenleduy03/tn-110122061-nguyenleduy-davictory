package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 7 - WRITING TASK
 * Bảng writing_scores: điểm từng tiêu chí cho một bài viết học viên
 * Mỗi bài nộp có 4 dòng (4 tiêu chí), mỗi dòng là một điểm band
 */
@Entity
@Table(name = "writing_scores",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_submission_criteria",
                columnNames = {"submission_id", "criteria_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WritingScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    private StudentWritingSubmission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criteria_id", nullable = false)
    private WritingScoringCriteria criteria;

    @Column(nullable = false)
    private Double score; // Điểm band cho tiêu chí này (0.0 – 9.0, bước 0.5)

    @Column(columnDefinition = "TEXT")
    private String feedback;
    // Nhận xét chi tiết của giảng viên cho tiêu chí này

    @Column(columnDefinition = "TEXT")
    private String inlineAnnotations;
    // Ghi chú trực tiếp trên bài (highlight lỗi), lưu dạng JSON

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scored_by")
    private User scoredBy; // Giảng viên chấm (null nếu AI chấm)

    @Column
    private LocalDateTime scoredAt; // Thời điểm chấm tiêu chí này

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
