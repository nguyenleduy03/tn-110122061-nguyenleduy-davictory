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
 * Bảng speaking_cue_cards: thẻ gợi ý cho Part 2 (Long Turn)
 * Học viên có 1 phút chuẩn bị, 1-2 phút nói về chủ đề trên thẻ
 */
@Entity
@Table(name = "speaking_cue_cards")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingCueCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "speaking_topic_id", nullable = false)
    private SpeakingTopic speakingTopic; // Chủ đề liên quan

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "difficulty_level_id")
    private DifficultyLevel difficultyLevel;

    @Column(nullable = false, length = 200)
    private String title; // Tiêu đề cue card, vd: "Describe a memorable journey"

    @Column(nullable = false, columnDefinition = "TEXT")
    private String taskPrompt;
    // Yêu cầu chính: "Describe a place you have visited that you particularly liked."

    @Column(columnDefinition = "TEXT")
    private String bulletPoints;
    // Các gợi ý con (JSON array):
    // ["Where it was", "When you went there", "What you did there",
    //  "And explain why you liked it so much"]

    @Column(columnDefinition = "TEXT")
    private String followUpQuestions;
    // Câu hỏi giáo viên hỏi sau Part 2 (JSON array hoặc xuống dòng)

    @Column(nullable = false)
    private Integer prepTimeSeconds = 60; // Thời gian chuẩn bị (giây, mặc định 60)

    @Column(nullable = false)
    private Integer minSpeakSeconds = 60; // Tối thiểu 60 giây

    @Column(nullable = false)
    private Integer maxSpeakSeconds = 120; // Tối đa 120 giây

    @Column(nullable = false)
    private Integer orderIndex;

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "cueCard", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt DESC")
    private List<SpeakingAttempt> attempts = new ArrayList<>();
}
