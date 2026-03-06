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
 * Bảng writing_prompts: đề bài Writing cụ thể
 * Mỗi prompt thuộc một WritingTask và có thể có nhiều bài mẫu
 */
@Entity
@Table(name = "writing_prompts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WritingPrompt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "writing_task_id", nullable = false)
    private WritingTask writingTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "difficulty_level_id")
    private DifficultyLevel difficultyLevel;

    @Column(nullable = false, length = 200)
    private String title; // Tiêu đề đề bài

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String promptText; // Nội dung đề bài (yêu cầu + ngữ cảnh)

    @Column(length = 500)
    private String imageUrl;
    // URL hình ảnh biểu đồ / sơ đồ (Task 1 Academic: bar chart, pie chart, map...)

    @Column(length = 50)
    private String chartType;
    // BAR_CHART, LINE_GRAPH, PIE_CHART, TABLE, MAP, PROCESS_DIAGRAM, MIXED (Task 1)
    // null cho Task 2

    @Column(length = 50)
    private String topic;
    // Education, Technology, Environment, Health, Society, Crime, Work, Culture...

    @Column(length = 30)
    private String essayType;
    // OPINION, DISCUSS_BOTH, PROBLEM_SOLUTION, ADVANTAGES_DISADVANTAGES, MIXED (Task 2)
    // null cho Task 1

    @Column(nullable = false)
    private Integer orderIndex;

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "writingPrompt", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("bandScore DESC")
    private List<WritingSampleAnswer> sampleAnswers = new ArrayList<>();

    @OneToMany(mappedBy = "writingPrompt", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("submittedAt DESC")
    private List<StudentWritingSubmission> submissions = new ArrayList<>();
}
