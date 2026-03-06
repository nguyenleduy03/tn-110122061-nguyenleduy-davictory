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
 * Bảng writing_scoring_criteria: tiêu chí chấm điểm Writing IELTS
 * 4 tiêu chí chuẩn: Task Achievement/Response, Coherence & Cohesion,
 * Lexical Resource, Grammatical Range & Accuracy
 */
@Entity
@Table(name = "writing_scoring_criteria",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_criteria_task",
                columnNames = {"writing_task_id", "code"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WritingScoringCriteria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "writing_task_id", nullable = false)
    private WritingTask writingTask;

    @Column(nullable = false, length = 30)
    private String code;
    // TA (Task Achievement/Response), CC (Coherence & Cohesion),
    // LR (Lexical Resource), GRA (Grammatical Range & Accuracy)

    @Column(nullable = false, length = 100)
    private String displayName;
    // "Task Achievement", "Coherence & Cohesion", "Lexical Resource",
    // "Grammatical Range & Accuracy"

    @Column(columnDefinition = "TEXT")
    private String description; // Mô tả tiêu chí

    @Column(nullable = false)
    private Double weight; // Trọng số tiêu chí (mỗi tiêu chí 0.25 = 25%)

    @Column(nullable = false)
    private Double maxScore; // Điểm tối đa (9.0)

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự hiển thị (1 → 4)

    @Column(columnDefinition = "TEXT")
    private String bandDescriptors;
    // Mô tả chi tiết cho từng band (0-9), lưu dạng JSON

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "criteria", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WritingScore> scores = new ArrayList<>();
}
