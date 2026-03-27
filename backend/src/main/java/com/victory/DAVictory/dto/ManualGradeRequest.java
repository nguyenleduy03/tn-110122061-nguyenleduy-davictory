package com.victory.DAVictory.dto;

import lombok.Data;

@Data
public class ManualGradeRequest {
    private Double listeningScore;
    private Double readingScore;
    private String feedback;
}
