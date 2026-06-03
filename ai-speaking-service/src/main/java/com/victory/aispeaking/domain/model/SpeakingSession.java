package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class SpeakingSession {
    String id;
    Long userId;
    String userName;
    String userRole;
    SessionConfig config;
    String status;
    String currentPhase; // INTRODUCTION, PART1, PART2, PART3, COMPLETED
    List<SpeakingTurn> turns;
    int totalTurns;
    LocalDateTime startedAt;
    LocalDateTime completedAt;
    String transcriptUrl;
    String notes;

    public boolean isActive() {
        return "ACTIVE".equals(status);
    }

    public boolean isCompleted() {
        return "COMPLETED".equals(status);
    }

    public boolean isPart(String part) {
        return currentPhase != null && currentPhase.equals(part);
    }
}
