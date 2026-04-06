package com.victory.DAVictory.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 3 - NGÂN HÀNG CÂU HỎI
 * Bảng answers: đáp án đúng cho dạng điền / câu trả lời ngắn
 * Dùng cho: Fill in Blank, Short Answer, Sentence Completion, Summary Completion...
 */
@Entity
@Table(name = "answers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Answer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String answerText; // Đáp án chính xác

    @Column(columnDefinition = "TEXT")
    private String alternativeAnswers;
    // Các đáp án chấp nhận được khác, lưu dạng JSON mảng:
    // ["colour","color"], hoặc cách nhau bởi |

    @Column(nullable = false)
    private Boolean isCaseSensitive = false; // Phân biệt hoa thường

    @Column
    private Boolean isSample = false; // Đáp án mẫu (hiển thị trong đề, không tính điểm)

    @Column(nullable = false)
    private Integer blankIndex;
    // Vị trí ô trống trong câu (1, 2, 3...)
    // Dùng khi câu hỏi có nhiều ô trống

    @Column(length = 50)
    private String wordLimit;
    // Giới hạn từ: "ONE WORD ONLY", "NO MORE THAN TWO WORDS", "A NUMBER"

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
