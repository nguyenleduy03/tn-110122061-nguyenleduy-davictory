package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 6 - LÀM BÀI THI (Exam Attempt)
 * Bảng attempt_answers: câu trả lời của học viên cho từng câu hỏi
 */
@Entity
@Table(name = "attempt_answers",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_attempt_question",
                columnNames = {"exam_attempt_id", "question_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttemptAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_attempt_id", nullable = false)
    private ExamAttempt examAttempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(columnDefinition = "TEXT")
    private String selectedOptionLabel;
    // Nhãn lựa chọn học viên chọn: "A", "B", "TRUE", "FALSE", "NOT GIVEN"

    @Column(columnDefinition = "TEXT")
    private String textAnswer;
    // Câu trả lời dạng điền / Short Answer / Essay / Letter

    @Column(columnDefinition = "TEXT")
    private String matchingAnswer;
    // Câu trả lời dạng nối, lưu JSON: {"i":"C","ii":"A","iii":"B"}

    @Column(nullable = false)
    private Boolean isAnswered = false; // Đã trả lời hay bỏ trống

    @Column
    private Boolean isCorrect; // Đúng / Sai (null nếu chưa chấm)

    @Column
    private Double pointsEarned; // Điểm nhận được cho câu này

    @Column(nullable = false)
    private Boolean isFlagged = false; // Học viên đánh dấu xem lại

    @Column(columnDefinition = "TEXT")
    private String correctionNote; // Ghi chú sửa bài của giảng viên

    @Column
    private LocalDateTime answeredAt; // Thời điểm trả lời câu này

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
