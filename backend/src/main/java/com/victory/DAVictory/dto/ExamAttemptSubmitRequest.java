package com.victory.DAVictory.dto;

import lombok.Data;

import java.util.List;

@Data
public class ExamAttemptSubmitRequest {

    private Integer timeSpentSeconds;
    private List<AttemptAnswerSave> answers;
}
