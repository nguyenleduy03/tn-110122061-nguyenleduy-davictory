package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_grading_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIGradingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String essayText;

    @Column(length = 50)
    private String taskType;

    @Column(length = 200)
    private String topic;

    @Column(columnDefinition = "TEXT")
    private String promptText;

    @Column(length = 50)
    private String chartType;

    @Column(length = 50)
    private String essayType;

    @Column(length = 50)
    private String letterType;

    private Double overallBand;

    private Double taskResponse;

    private Double coherenceCohesion;

    private Double lexicalResource;

    private Double grammaticalRange;

    @Column(columnDefinition = "TEXT")
    private String overallFeedback;

    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(columnDefinition = "TEXT")
    private String weaknesses;

    @Column(columnDefinition = "TEXT")
    private String improvementPriority;

    @Column(length = 100)
    private String provider;

    @Column(length = 100)
    private String model;

    private Long latencyMs;

    private Double confidenceScore;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
