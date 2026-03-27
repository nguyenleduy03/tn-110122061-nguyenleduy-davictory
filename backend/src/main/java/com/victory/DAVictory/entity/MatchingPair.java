package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 3 - NGÂN HÀNG CÂU HỎI
 * Bảng matching_pairs: dữ liệu cho dạng câu hỏi nối (Matching)
 * Ví dụ: Matching Headings, Matching Features, Matching Sentence Endings
 * Mỗi cặp gồm: cột trái (tiêu đề / phát biểu) và cột phải (đoạn / thông tin)
 */
@Entity
@Table(name = "matching_pairs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatchingPair {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_group_id", nullable = false)
    private QuestionGroup questionGroup;

    @Column(nullable = false, length = 10)
    private String leftLabel;
    // Nhãn cột trái: "i", "ii", "iii" (heading) hoặc "A", "B", "C" (features)

    @Column(nullable = false, columnDefinition = "TEXT")
    private String leftContent; // Nội dung cột trái (tiêu đề, thông tin...)

    @Column(length = 10)
    private String rightLabel; // Nhãn cột phải: "1", "2", ... hoặc "A", "B"...

    @Column(columnDefinition = "TEXT")
    private String rightContent; // Nội dung cột phải (đoạn văn, câu kết...)

    @Column(length = 500)
    private String imageUrl; // URL ảnh cho dropdown (Google Drive link)

    @Column(nullable = false, length = 20)
    private String matchType;
    // HEADING_TO_PARAGRAPH, FEATURE_TO_STATEMENT,
    // SENTENCE_ENDING, CAUSE_EFFECT

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự trong group

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
