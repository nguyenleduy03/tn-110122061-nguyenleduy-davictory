package com.victory.DAVictory.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 3 - NGÂN HÀNG CÂU HỎI
 * Bảng question_options: các lựa chọn đáp án cho câu hỏi trắc nghiệm
 * Dùng cho: MCQ (A/B/C/D), True/False/Not Given, Yes/No/Not Given
 */
@Entity
@Table(name = "question_options")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false, length = 20)
    private String optionLabel;
    // MCQ: "A", "B", "C", "D"
    // TFNG: "TRUE", "FALSE", "NOT GIVEN"
    // YNNG: "YES", "NO", "NOT GIVEN"

    @Column(nullable = false, columnDefinition = "TEXT")
    private String optionText; // Nội dung lựa chọn

    @Column(columnDefinition = "LONGTEXT")
    private String imageUrl; // Hình minh hoạ cho lựa chọn (nếu có)

    @Column(nullable = false)
    private Boolean isCorrect = false; // Đây có phải đáp án đúng không

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự hiển thị

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
