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
 * Bảng writing_sample_answers: bài viết mẫu band cao cho từng đề bài
 */
@Entity
@Table(name = "writing_sample_answers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WritingSampleAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "writing_prompt_id", nullable = false)
    private WritingPrompt writingPrompt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy; // Giảng viên tạo bài mẫu

    @Column(nullable = false)
    private Double bandScore; // Band score của bài mẫu này (6.0, 7.0, 8.0, 9.0)

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String answerText; // Nội dung bài viết mẫu

    @Column(nullable = false)
    private Integer wordCount; // Số từ của bài mẫu

    @Column(columnDefinition = "TEXT")
    private String annotation;
    // Ghi chú phân tích bài mẫu (highlight điểm hay, cấu trúc...)

    @Column(columnDefinition = "TEXT")
    private String vocabularyHighlights;
    // Từ vựng nổi bật trong bài mẫu (JSON hoặc plain text)

    @Column(columnDefinition = "TEXT")
    private String structureNotes;
    // Ghi chú về cấu trúc bài viết (Introduction, Body, Conclusion...)

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
