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
 * Bảng question_explanations: giải thích đáp án chi tiết
 * Một câu hỏi có đúng một explanation (OneToOne)
 */
@Entity
@Table(name = "question_explanations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionExplanation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false, unique = true)
    private Question question;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String explanationText;
    // Giải thích đáp án bằng văn bản, có thể có HTML/Markdown

    @Column(length = 500)
    private String videoUrl; // URL video giải thích (nếu có)

    @Column(columnDefinition = "TEXT")
    private String referenceText;
    // Đoạn văn bản trong bài gốc có chứa đáp án (highlight/quote)

    @Column(length = 100)
    private String referenceLocation;
    // Vị trí tham chiếu: "Paragraph 3", "Lines 12-15"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy; // Giảng viên tạo giải thích

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
