package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_progress",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "tracked_date"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Học viên được theo dõi
    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(nullable = false)
    private LocalDate trackedDate; // Ngày ghi nhận tiến độ (1 bản ghi / ngày / học viên)

    // ===== THỐNG KÊ HỌC TRONG NGÀY =====
    @Column(nullable = false)
    private Integer testsAttempted = 0; // Số đề thi đã bắt đầu làm

    @Column(nullable = false)
    private Integer testsCompleted = 0; // Số đề thi hoàn thành (nộp bài)

    @Column(nullable = false)
    private Integer questionsAttempted = 0; // Tổng số câu hỏi đã làm

    @Column(nullable = false)
    private Integer questionsCorrect = 0; // Số câu trả lời đúng

    @Column(nullable = false)
    private Integer studyMinutes = 0; // Tổng thời gian học trong ngày (phút)

    // ===== ĐIỂM TỔNG HỢP TẠI THỜI ĐIỂM NÀY =====
    @Column
    private Double overallBandScore; // Band IELTS tổng hợp (0.0 - 9.0)

    @Column
    private Double listeningScore; // Band Listening hiện tại

    @Column
    private Double readingScore; // Band Reading hiện tại

    @Column
    private Double writingScore; // Band Writing hiện tại

    @Column
    private Double speakingScore; // Band Speaking hiện tại

    // ===== STREAK HỌC LIÊN TỤC =====
    @Column(nullable = false)
    private Integer currentStreak = 0; // Số ngày học liên tiếp tính đến ngày này

    @Column(nullable = false)
    private Integer longestStreak = 0; // Kỷ lục streak dài nhất từ trước đến nay

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
