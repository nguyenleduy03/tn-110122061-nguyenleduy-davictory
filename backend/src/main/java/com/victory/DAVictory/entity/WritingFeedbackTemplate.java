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
 * Bảng writing_feedback_templates: mẫu feedback giáo viên dùng lại nhiều lần
 * Giúp giảng viên chấm bài nhanh hơn bằng cách chọn template có sẵn
 */
@Entity
@Table(name = "writing_feedback_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WritingFeedbackTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "writing_task_id", nullable = false)
    private WritingTask writingTask; // Áp dụng cho Task 1 hay Task 2

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criteria_id")
    private WritingScoringCriteria criteria;
    // Tiêu chí liên quan (null = feedback tổng quát)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy; // Giảng viên tạo template

    @Column(nullable = false, length = 100)
    private String title; // Tên template ngắn gọn

    @Column(nullable = false, columnDefinition = "TEXT")
    private String templateText; // Nội dung mẫu feedback

    @Column(length = 30)
    private String issueType;
    // TASK_RESPONSE, STRUCTURE, VOCABULARY, GRAMMAR,
    // WORD_COUNT, TOPIC_RELEVANCE, GENERAL

    @Column(length = 20)
    private String applicableBandRange;
    // Dải band phù hợp để dùng template này: "4.0-5.5", "6.0-7.5"

    @Column(nullable = false)
    private Integer usageCount = 0; // Số lần giảng viên đã dùng template này

    @Column(nullable = false)
    private Boolean isShared = false;
    // false = chỉ giảng viên tạo dùng, true = chia sẻ với tất cả

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
