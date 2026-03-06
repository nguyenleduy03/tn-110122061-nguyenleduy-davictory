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
 * Bảng attempt_sections: trạng thái của học viên trong từng phần (Part) của bài thi
 * Ví dụ: Part 1 đã hoàn thành, Part 2 đang làm, Part 3 chưa bắt đầu
 */
@Entity
@Table(name = "attempt_sections",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_attempt_part",
                columnNames = {"exam_attempt_id", "part_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttemptSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_attempt_id", nullable = false)
    private ExamAttempt examAttempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part; // Phần thi tương ứng

    @Column(nullable = false, length = 20)
    private String status;
    // NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED

    @Column
    private LocalDateTime startedAt; // Thời điểm bắt đầu phần này

    @Column
    private LocalDateTime completedAt; // Thời điểm hoàn thành phần này

    @Column
    private Integer timeSpentSeconds; // Tổng thời gian làm phần này (giây)

    @Column
    private Integer answeredCount; // Số câu đã trả lời trong phần này

    @Column
    private Integer correctCount; // Số câu đúng trong phần này (sau chấm)

    @Column
    private Double sectionScore; // Điểm của phần này

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự phần thi (theo Part.orderIndex)

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
