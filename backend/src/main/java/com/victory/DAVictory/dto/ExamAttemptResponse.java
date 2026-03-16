package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.SkillType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExamAttemptResponse {

    private Long id;
    private Long testId;
    private String testTitle;
    private Long sessionId;
    private SkillType skillType;

    private Long userId;
    private String username;

    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime gradedAt;

    private Integer timeLimitSeconds;
    private Integer timeSpentSeconds;

    private Integer totalAnswered;
    private Integer totalCorrect;
    private Double rawScore;
    private Double bandScore;

    private Integer attemptNumber;
}
