package com.victory.aispeaking.infrastructure.persistence;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "speaking_results")
@Data
@NoArgsConstructor
public class SpeakingResultEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String resultId;

    @Column(nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private Long userId;

    private double overallBand;

    private int fcBand;
    @Column(columnDefinition = "TEXT")
    private String fcFeedback;

    private int lrBand;
    @Column(columnDefinition = "TEXT")
    private String lrFeedback;

    private int graBand;
    @Column(columnDefinition = "TEXT")
    private String graFeedback;

    private int pBand;
    @Column(columnDefinition = "TEXT")
    private String pFeedback;

    @Column(columnDefinition = "TEXT")
    private String overallFeedback;

    @Column(columnDefinition = "TEXT")
    private String improvementPriority;

    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(columnDefinition = "TEXT")
    private String weaknesses;

    private String provider;
    private String model;
    private Double confidenceScore;
    private String promptVersion;

    private Integer promptTokens;
    private Integer completionTokens;
    private Long latencyMs;

    @Column(nullable = false)
    private String status;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
