package com.victory.aispeaking.infrastructure.persistence;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "speaking_sessions")
@Data
@NoArgsConstructor
public class SpeakingSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String sessionId;

    @Column(nullable = false)
    private Long userId;

    private String userName;

    @Column(nullable = false)
    private String userRole;

    @Column(columnDefinition = "TEXT")
    private String configJson;

    @Column(nullable = false)
    private String status;

    private String currentPhase;

    @Column(nullable = false)
    private int totalTurns;

    @Column(columnDefinition = "TEXT")
    private String transcriptJson;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
