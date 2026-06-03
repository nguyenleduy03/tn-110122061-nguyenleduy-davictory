package com.victory.aispeaking.infrastructure.persistence;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "speaking_turns")
@Data
@NoArgsConstructor
public class SpeakingTurnEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private int turnNumber;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String questionText;

    private String questionId;

    @Column(columnDefinition = "TEXT")
    private String answerText;

    private String audioUrl;

    private int answerDurationMs;

    @Column(nullable = false)
    private LocalDateTime askedAt;

    private LocalDateTime answeredAt;

    @Column(nullable = false)
    private String part;

    private String topicLabel;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
