package com.victory.DAVictory.entity;

import com.victory.DAVictory.enums.SkillType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "student_skill_scores",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "skill_type"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentSkillScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Học viên
    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SkillType skillType; // LISTENING, READING, WRITING, SPEAKING

    // ===== ĐIỂM SỐ =====
    @Column(nullable = false)
    private Double currentScore = 0.0; // Band score hiện tại (0.0 - 9.0)

    @Column
    private Double bestScore; // Band score cao nhất từng đạt được

    @Column
    private Double targetScore; // Band score mục tiêu của học viên

    // ===== THỐNG KÊ =====
    @Column(nullable = false)
    private Integer totalAttempts = 0; // Tổng số lần làm bài ở kỹ năng này

    @Column(nullable = false)
    private Integer totalQuestionsAttempted = 0; // Tổng số câu đã làm

    @Column(nullable = false)
    private Integer totalQuestionsCorrect = 0; // Tổng số câu đúng

    @Column
    private Double accuracyRate; // Tỷ lệ đúng (%) — tính từ correct/attempted

    @Column(nullable = false)
    private Integer totalStudyMinutes = 0; // Tổng thời gian luyện kỹ năng này (phút)

    // ===== MỐC THỜI GIAN =====
    @Column
    private LocalDateTime lastAttemptAt; // Lần làm bài gần nhất

    @Column
    private LocalDateTime bestScoreAchievedAt; // Thời điểm đạt điểm cao nhất

    // ===== XU HƯỚNG TIẾN BỘ =====
    @Column(length = 20)
    private String trend; // IMPROVING, STABLE, DECLINING (tính từ 5 lần gần nhất)

    @Column
    private Double scoreChange; // Thay đổi so với lần đánh giá trước (+/-)

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
