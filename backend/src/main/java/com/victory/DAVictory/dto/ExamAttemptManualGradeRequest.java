package com.victory.DAVictory.dto;

import lombok.Data;

@Data
public class ExamAttemptManualGradeRequest {
    private Integer totalCorrect;
    private Double bandScore;
    private String feedback;
    private String editReason;
}
