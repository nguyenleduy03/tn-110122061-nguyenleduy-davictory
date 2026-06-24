package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Nhóm 6 - LÀM BÀI THI (Exam Attempt)
 * Bảng exam_attempts: mỗi lần học viên bắt đầu một bài thi
 */
@Entity
@Table(name = "exam_attempts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Học viên làm bài

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session; // Kỳ thi (Listening / Reading / Writing / Speaking)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id")
    private Test test; // Đề thi gốc (để lọc theo đề)

    @Column(nullable = false, length = 20)
    private String status;
    // IN_PROGRESS, SUBMITTED, TIMED_OUT, ABANDONED, GRADED

    @Column(nullable = false)
    private LocalDateTime startedAt; // Thời điểm bắt đầu làm bài

    @Column
    private LocalDateTime submittedAt; // Thời điểm nộp bài

    @Column
    private LocalDateTime gradedAt; // Thời điểm chấm xong (nếu có)

    @Column
    private Integer timeLimitSeconds; // Giới hạn thời gian (giây)

    @Column
    private Integer timeSpentSeconds; // Tổng thời gian đã làm (giây)

    @Column
    private Integer totalAnswered; // Số câu đã trả lời

    @Column
    private Integer totalCorrect; // Số câu đúng (sau khi chấm)

    @Column
    private Double rawScore; // Điểm thô (số câu đúng / điểm tổng)

    @Column(precision = 2)
    private Double bandScore; // Band score IELTS (0.0 – 9.0)

    @Column(columnDefinition = "TEXT")
    private String feedback; // Nhận xét của giảng viên (Writing/Speaking)

    @Column(nullable = false)
    private Integer attemptNumber; // Lần thứ mấy làm bài thi này (1, 2, 3...)

    @Column(length = 50)
    private String attemptType; // FULL_TEST, SINGLE_SKILL, PRACTICE_FULL_TEST, PRACTICE_SINGLE_SKILL, CUSTOM

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id")
    private Exam exam;

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Câu trả lời của học viên trong lần thi này
    @OneToMany(mappedBy = "examAttempt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AttemptAnswer> answers = new ArrayList<>();

    // Trạng thái từng phần thi
    @OneToMany(mappedBy = "examAttempt", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<AttemptSection> sections = new ArrayList<>();

    // Thời gian từng câu
    @OneToMany(mappedBy = "examAttempt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AttemptQuestionTime> questionTimes = new ArrayList<>();
}
