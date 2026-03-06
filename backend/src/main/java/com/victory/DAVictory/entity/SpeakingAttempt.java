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
 * Nhóm 8 - SPEAKING
 * Bảng speaking_attempts: bài nói của học viên
 * Mỗi attempt gắn với một Part cụ thể (Part 1 / 2 / 3) và chủ đề / cue card
 */
@Entity
@Table(name = "speaking_attempts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Học viên thực hiện

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_attempt_id")
    private ExamAttempt examAttempt; // Liên kết lần thi (nếu là thi chính thức)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "speaking_topic_id")
    private SpeakingTopic speakingTopic; // Dùng cho Part 1 và Part 3

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cue_card_id")
    private SpeakingCueCard cueCard; // Dùng cho Part 2

    @Column(nullable = false, length = 10)
    private String speakingPart;
    // PART1, PART2, PART3, FULL (toàn bộ 3 phần)

    @Column(nullable = false, length = 20)
    private String status;
    // IN_PROGRESS, SUBMITTED, UNDER_REVIEW, GRADED, RETURNED

    @Column
    private LocalDateTime startedAt;

    @Column
    private LocalDateTime submittedAt;

    @Column
    private LocalDateTime gradedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by")
    private User gradedBy; // Giảng viên chấm (null nếu tự luyện)

    @Column
    private Integer totalDurationSeconds; // Tổng thời gian bài nói (giây)

    @Column
    private Double overallBandScore; // Band score tổng kết (0.0 – 9.0)

    @Column(nullable = false)
    private Integer attemptNumber; // Lần thứ mấy luyện chủ đề này

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // File âm thanh ghi âm
    @OneToMany(mappedBy = "speakingAttempt", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("recordingOrder ASC")
    private List<SpeakingRecording> recordings = new ArrayList<>();

    // Điểm từng tiêu chí
    @OneToOne(mappedBy = "speakingAttempt", cascade = CascadeType.ALL, orphanRemoval = true)
    private SpeakingScore score;

    // Nhận xét giảng viên
    @OneToOne(mappedBy = "speakingAttempt", cascade = CascadeType.ALL, orphanRemoval = true)
    private SpeakingFeedback feedback;
}
