package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "question_statistics")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionStatistic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mỗi câu hỏi có đúng 1 bản thống kê
    @OneToOne
    @JoinColumn(name = "question_id", nullable = false, unique = true)
    private Question question;

    // ===== LƯỢT LÀM BÀI =====
    @Column(nullable = false)
    private Integer totalAttempts = 0; // Tổng số lần câu này được làm

    @Column(nullable = false)
    private Integer correctCount = 0; // Số lần trả lời đúng

    @Column(nullable = false)
    private Integer wrongCount = 0; // Số lần trả lời sai

    @Column(nullable = false)
    private Integer skippedCount = 0; // Số lần bỏ qua không trả lời

    // ===== TỶ LỆ =====
    @Column
    private Double correctRate; // Tỷ lệ đúng (0.0 - 1.0)

    @Column
    private Double skipRate; // Tỷ lệ bỏ qua (0.0 - 1.0)

    // ===== THỜI GIAN =====
    @Column
    private Double avgTimeSeconds; // Thời gian trung bình để trả lời (giây)

    @Column
    private Double minTimeSeconds; // Thời gian nhanh nhất (giây)

    @Column
    private Double maxTimeSeconds; // Thời gian chậm nhất (giây)

    // ===== CHỈ SỐ PHÂN TÍCH =====
    @Column
    private Double discriminationIndex;
    // Chỉ số phân biệt (IRT): dương cao = phân biệt tốt người giỏi/yếu
    // Thường: < 0.2 kém, 0.2-0.4 trung bình, > 0.4 tốt

    @Column
    private Double actualDifficultyScore;
    // Độ khó thực tế từ dữ liệu: = 1 - correctRate
    // 0.0 = rất dễ (ai cũng đúng), 1.0 = rất khó (không ai đúng)

    @Column(length = 20)
    private String difficultyCategory;
    // Phân loại tự động: VERY_EASY, EASY, MEDIUM, HARD, VERY_HARD

    // ===== THỜI ĐIỂM =====
    @Column
    private LocalDateTime lastAttemptAt; // Lần được làm gần nhất

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
