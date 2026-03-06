package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "test_statistics")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestStatistic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mỗi đề thi có đúng 1 bản thống kê
    @OneToOne
    @JoinColumn(name = "test_id", nullable = false, unique = true)
    private Test test;

    // ===== LƯỢT THI =====
    @Column(nullable = false)
    private Integer totalAttempts = 0; // Tổng lượt thi

    @Column(nullable = false)
    private Integer completedAttempts = 0; // Lượt thi hoàn thành (đã nộp bài)

    @Column(nullable = false)
    private Integer abandonedAttempts = 0; // Lượt thi bỏ giữa chừng

    @Column
    private Double completionRate; // Tỷ lệ hoàn thành (%)

    // ===== BAND SCORE TỔNG HỢP =====
    @Column
    private Double avgBandScore; // Band IELTS trung bình của tất cả lượt thi

    @Column
    private Double highestBandScore; // Band cao nhất từng đạt

    @Column
    private Double lowestBandScore; // Band thấp nhất từng đạt

    // ===== ĐIỂM TỪNG KỸ NĂNG (trung bình) =====
    @Column
    private Double avgListeningScore; // Band Listening trung bình

    @Column
    private Double avgReadingScore; // Band Reading trung bình

    @Column
    private Double avgWritingScore; // Band Writing trung bình

    @Column
    private Double avgSpeakingScore; // Band Speaking trung bình

    // ===== THỜI GIAN =====
    @Column
    private Double avgCompletionMinutes; // Thời gian hoàn thành trung bình (phút)

    @Column
    private Double minCompletionMinutes; // Thời gian nhanh nhất

    @Column
    private Double maxCompletionMinutes; // Thời gian chậm nhất

    // ===== HỌC VIÊN =====
    @Column(nullable = false)
    private Integer uniqueStudents = 0; // Số học viên khác nhau đã thi

    // ===== MỐC THỜI GIAN =====
    @Column
    private LocalDateTime lastAttemptAt; // Lượt thi gần nhất

    @Column
    private LocalDateTime statsUpdatedAt; // Lần cuối cập nhật thống kê

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
