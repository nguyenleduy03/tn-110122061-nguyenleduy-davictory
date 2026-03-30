package com.victory.DAVictory.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class WritingGradeHistoryResponse {
    private Long id;
    private String editedByUsername;
    private String editedByFullName;
    private String editorRole;
    private Double oldBandScore;
    private Double newBandScore;
    private String oldFeedback;
    private String newFeedback;
    private String editReason;
    private LocalDateTime editedAt;
}
