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
 * Nhóm 10 - TAG & PHÂN LOẠI
 * Bảng tags: danh sách tag chuẩn hóa dùng để phân loại và tìm kiếm câu hỏi
 *
 * Khác với question_tags (Nhóm 3 — lưu inline string),
 * bảng này là master data cho tag, có id riêng và metadata đầy đủ.
 */
@Entity
@Table(name = "tags",
        uniqueConstraints = @UniqueConstraint(name = "uk_tag_name_category", columnNames = {"name", "category"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;
    // Tên tag: "grammar", "vocabulary", "environment", "bar chart"...

    @Column(nullable = false, length = 30)
    private String category;
    // SKILL       — grammar, vocabulary, paraphrasing, cohesion
    // TOPIC       — environment, technology, education, health, crime, culture
    // EXAM_TYPE   — academic, general
    // QUESTION_TYPE — multiple_choice, fill_blank, matching, tfng
    // DIFFICULTY  — easy, medium, hard
    // SKILL_TYPE  — listening, reading, writing, speaking

    @Column(length = 255)
    private String description; // Mô tả ngắn về tag

    @Column(length = 20)
    private String colorCode; // Màu hiển thị trên UI: #4CAF50, #2196F3...

    @Column(nullable = false)
    private Integer usageCount = 0; // Số lần tag được gắn (cache đếm nhanh)

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Liên kết ngược với bảng mapping
    @OneToMany(mappedBy = "tag", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuestionTagMap> questionTagMaps = new ArrayList<>();
}
