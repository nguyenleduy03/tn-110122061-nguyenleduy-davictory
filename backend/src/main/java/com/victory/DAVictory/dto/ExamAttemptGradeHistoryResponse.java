package com.victory.DAVictory.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExamAttemptGradeHistoryResponse {
    private Long id;
    private String editedByUsername;
    private String editorRole;
    private Integer oldTotalCorrect;
    private Integer newTotalCorrect;
    private Double oldBandScore;
    private Double newBandScore;
    private String oldFeedback;
    private String newFeedback;
    private String editReason;
    private LocalDateTime editedAt;
}
