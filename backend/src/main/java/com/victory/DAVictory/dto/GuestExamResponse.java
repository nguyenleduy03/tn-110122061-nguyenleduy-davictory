package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.SkillType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class GuestExamResponse {
    private Long id;
    private String fullName;
    private String email;
    private Long testId;
    private String testTitle;
    private Long sessionId;
    private SkillType skillType;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private Integer timeLimitSeconds;
    private Integer timeSpentSeconds;
    private Integer totalAnswered;
    private Integer totalCorrect;
    private Double rawScore;
    private Double bandScore;
}
