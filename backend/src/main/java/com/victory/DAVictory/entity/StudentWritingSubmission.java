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
 * Nhóm 7 - WRITING TASK
 * Bảng student_writing_submissions: bài viết học viên nộp
 */
@Entity
@Table(name = "student_writing_submissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentWritingSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Học viên nộp bài

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "writing_prompt_id", nullable = false)
    private WritingPrompt writingPrompt; // Đề bài

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_attempt_id")
    private ExamAttempt examAttempt; // Liên kết lần thi (nếu nộp trong bài thi chính thức)

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String submissionText; // Nội dung bài viết học viên

    @Column(nullable = false)
    private Integer wordCount; // Số từ học viên viết

    @Column(nullable = false, length = 20)
    private String status;
    // DRAFT, SUBMITTED, UNDER_REVIEW, GRADED, RETURNED

    @Column
    private LocalDateTime submittedAt; // Thời điểm nộp bài

    @Column
    private LocalDateTime gradedAt; // Thời điểm chấm xong

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by")
    private User gradedBy; // Giảng viên chấm bài (null nếu AI chấm)

    @Column
    private Double overallBandScore; // Điểm band tổng kết

    @Column(columnDefinition = "TEXT")
    private String overallFeedback; // Nhận xét tổng thể của giảng viên

    @Column
    private Integer timeTakenSeconds; // Thời gian học viên làm bài (giây)

    @Column(nullable = false)
    private Integer attemptNumber; // Lần nộp thứ mấy cho đề này

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Điểm từng tiêu chí
    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WritingScore> scores = new ArrayList<>();
}
