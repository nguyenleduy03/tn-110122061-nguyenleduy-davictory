package com.victory.DAVictory.dto;

import lombok.Data;

@Data
public class AssignmentGradeRequest {
    private Long submissionId;
    private Double score;
    private String feedback;
}
