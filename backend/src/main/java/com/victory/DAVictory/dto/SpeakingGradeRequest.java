package com.victory.DAVictory.dto;

import lombok.Data;

@Data
public class SpeakingGradeRequest {
    private Double fluencyCoherence;
    private Double lexicalResource;
    private Double grammaticalRangeAccuracy;
    private Double pronunciation;
    private String feedback;
}
