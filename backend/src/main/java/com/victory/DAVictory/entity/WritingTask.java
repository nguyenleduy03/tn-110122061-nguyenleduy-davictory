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
 * Nhóm 7 - WRITING TASK
 * Bảng writing_tasks: loại bài viết IELTS
 * Ví dụ: Task 1 Academic (mô tả biểu đồ), Task 1 General (viết thư), Task 2 Essay
 */
@Entity
@Table(name = "writing_tasks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WritingTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;
    // TASK1_ACADEMIC, TASK1_GENERAL, TASK2_ACADEMIC, TASK2_GENERAL

    @Column(nullable = false, length = 100)
    private String displayName;
    // "Task 1 - Academic (Graph/Chart)", "Task 1 - General (Letter)", "Task 2 - Essay"

    @Column(columnDefinition = "TEXT")
    private String description; // Mô tả loại bài viết

    @Column(columnDefinition = "TEXT")
    private String instructions; // Hướng dẫn chung cho loại bài này

    @Column(nullable = false)
    private Integer minWords; // Số từ tối thiểu (Task 1: 150, Task 2: 250)

    @Column(nullable = false)
    private Integer recommendedWords; // Số từ khuyến nghị

    @Column(nullable = false)
    private Integer durationMinutes; // Thời gian khuyến nghị (Task 1: 20, Task 2: 40)

    @Column(nullable = false)
    private Double scoreWeight;
    // Task 1: 0.33 (33%), Task 2: 0.67 (67%)

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự hiển thị

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "writingTask", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WritingPrompt> prompts = new ArrayList<>();

    @OneToMany(mappedBy = "writingTask", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WritingScoringCriteria> scoringCriterias = new ArrayList<>();

    @OneToMany(mappedBy = "writingTask", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WritingFeedbackTemplate> feedbackTemplates = new ArrayList<>();
}
