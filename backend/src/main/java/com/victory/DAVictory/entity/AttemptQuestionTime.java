package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 6 - LÀM BÀI THI (Exam Attempt)
 * Bảng attempt_question_times: thời gian học viên dành cho từng câu hỏi
 * Dùng để phân tích tốc độ làm bài, nhận diện câu khó
 */
@Entity
@Table(name = "attempt_question_times",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_attempt_question_time",
                columnNames = {"exam_attempt_id", "question_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttemptQuestionTime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_attempt_id", nullable = false)
    private ExamAttempt examAttempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false)
    private Integer timeSpentSeconds; // Tổng số giây dành cho câu này

    @Column
    private Integer visitCount; // Số lần quay lại câu này

    @Column
    private LocalDateTime firstVisitAt; // Lần đầu tiên mở câu này

    @Column
    private LocalDateTime lastVisitAt; // Lần cuối cùng sửa câu này

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
