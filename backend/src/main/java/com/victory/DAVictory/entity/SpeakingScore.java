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
 * Bảng speaking_scores: điểm 4 tiêu chí chấm Speaking IELTS
 * FC  - Fluency & Coherence
 * LR  - Lexical Resource
 * GRA - Grammatical Range & Accuracy
 * P   - Pronunciation
 */
@Entity
@Table(name = "speaking_scores")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "speaking_attempt_id", nullable = false, unique = true)
    private SpeakingAttempt speakingAttempt;

    // ── 4 tiêu chí chính (band 0 – 9, bước 0.5) ──────────────────────────────

    @Column
    private Double fluencyCoherence;       // Fluency & Coherence

    @Column
    private Double lexicalResource;        // Lexical Resource

    @Column
    private Double grammaticalRangeAccuracy; // Grammatical Range & Accuracy

    @Column
    private Double pronunciation;          // Pronunciation

    // ── Điểm tổng kết ─────────────────────────────────────────────────────────

    @Column
    private Double overallBandScore;
    // Trung bình cộng 4 tiêu chí, làm tròn theo quy tắc IELTS

    // ── Điểm từng phần (nếu chấm riêng Part 1/2/3) ──────────────────────────

    @Column
    private Double part1Score;

    @Column
    private Double part2Score;

    @Column
    private Double part3Score;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scored_by")
    private User scoredBy; // Giảng viên chấm (null nếu AI chấm)

    @Column
    private LocalDateTime scoredAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
