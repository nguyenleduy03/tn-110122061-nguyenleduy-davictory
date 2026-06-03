package com.victory.aispeaking.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class SpeakingSessionDTO {
    private String id;
    private Long userId;
    private String userName;
    private String status;
    private String currentPhase;
    private int totalTurns;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String config;
    private List<SpeakingTurnDTO> turns;
}
