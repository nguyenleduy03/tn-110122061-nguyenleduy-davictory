package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class SpeakingTurn {
    String id;
    String sessionId;
    int turnNumber;
    String questionText;
    String questionId;
    String answerText;
    String audioUrl;
    int answerDurationMs;
    LocalDateTime askedAt;
    LocalDateTime answeredAt;
    String part; // PART1, PART2, PART3
    String topicLabel;
}
