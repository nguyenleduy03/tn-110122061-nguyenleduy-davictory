package com.victory.DAVictory.dto;

import lombok.Data;

@Data
public class AttemptAnswerSave {

    private Long questionId;
    private String selectedOptionLabel;
    private String textAnswer;
    private String matchingAnswer;
    private Boolean isFlagged;
    private String speakingPart; // WARMUP, PART1, PART2, PART2_FOLLOWUP, PART3
}
