package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 8 - SPEAKING
 * Bảng speaking_feedback: nhận xét chi tiết của giảng viên cho bài nói
 */
@Entity
@Table(name = "speaking_feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "speaking_attempt_id", nullable = false, unique = true)
    private SpeakingAttempt speakingAttempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy; // Giảng viên viết nhận xét

    // ── Nhận xét tổng thể ────────────────────────────────────────────────────

    @Column(columnDefinition = "TEXT")
    private String overallFeedback; // Nhận xét chung toàn bài

    @Column(columnDefinition = "TEXT")
    private String strengths; // Điểm mạnh của học viên

    @Column(columnDefinition = "TEXT")
    private String areasToImprove; // Điểm cần cải thiện

    // ── Nhận xét theo tiêu chí ────────────────────────────────────────────────

    @Column(columnDefinition = "TEXT")
    private String fluencyFeedback; // Nhận xét về Fluency & Coherence

    @Column(columnDefinition = "TEXT")
    private String lexicalFeedback; // Nhận xét về Lexical Resource

    @Column(columnDefinition = "TEXT")
    private String grammarFeedback; // Nhận xét về Grammatical Range & Accuracy

    @Column(columnDefinition = "TEXT")
    private String pronunciationFeedback; // Nhận xét về Pronunciation

    // ── Gợi ý luyện tập ──────────────────────────────────────────────────────

    @Column(columnDefinition = "TEXT")
    private String practiceRecommendations;
    // Gợi ý luyện tập tiếp theo, từ cần học thêm, cấu trúc cần rèn...

    @Column(columnDefinition = "TEXT")
    private String samplePhrases;
    // Cụm từ / câu mẫu giảng viên đề xuất học viên sử dụng

    @Column(length = 500)
    private String videoFeedbackUrl;
    // URL video nhận xét của giảng viên (nếu có)

    @Column
    private LocalDateTime feedbackAt; // Thời điểm gửi nhận xét

    @Column(nullable = false)
    private Boolean isRead = false; // Học viên đã đọc chưa

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
