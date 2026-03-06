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
 * Bảng speaking_topics: chủ đề Speaking cho Part 1 và Part 3
 * Part 1: câu hỏi ngắn về chủ đề quen thuộc
 * Part 3: câu hỏi thảo luận chuyên sâu liên quan Part 2
 */
@Entity
@Table(name = "speaking_topics")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingTopic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title; // Tên chủ đề: "Family", "Technology", "Environment"

    @Column(length = 30)
    private String part;
    // PART1, PART3, PART1_PART3 (một topic dùng ở cả Part 1 lẫn Part 3)

    @Column(columnDefinition = "TEXT")
    private String description; // Mô tả ngắn về chủ đề

    @Column(columnDefinition = "TEXT")
    private String sampleQuestions;
    // Danh sách câu hỏi mẫu (JSON array hoặc xuống dòng)
    // Part 1: "Do you have a big family?", "How often do you see them?"
    // Part 3: "How has family structure changed in your country?"

    @Column(length = 50)
    private String category;
    // PERSONAL, SOCIAL, ENVIRONMENT, TECHNOLOGY, EDUCATION,
    // WORK, CULTURE, HEALTH, TRAVEL, MEDIA

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "difficulty_level_id")
    private DifficultyLevel difficultyLevel;

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

    @OneToMany(mappedBy = "speakingTopic", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<SpeakingCueCard> cueCards = new ArrayList<>();
}
