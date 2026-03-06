package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 3 - NGÂN HÀNG CÂU HỎI
 * Bảng question_tags: gắn tag phân loại cho câu hỏi
 * Ví dụ: "grammar", "vocabulary", "academic", "science", "environment"
 */
@Entity
@Table(name = "question_tags",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_question_tag",
                columnNames = {"question_id", "tag_name"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "tag_name", nullable = false, length = 50)
    private String tagName; // Tên tag: "grammar", "vocabulary", "academic"...

    @Column(length = 30)
    private String tagCategory;
    // SKILL (grammar, vocabulary), TOPIC (science, technology, environment),
    // EXAM_TYPE (academic, general), DIFFICULTY...

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
