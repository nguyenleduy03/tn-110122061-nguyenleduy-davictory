package com.victory.aispeaking.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class SpeakingTurnDTO {
    private int turnNumber;
    private String questionText;
    private String questionId;
    private String answerText;
    private String audioUrl;
    private int answerDurationMs;
    private LocalDateTime askedAt;
    private LocalDateTime answeredAt;
    private String part;
}
