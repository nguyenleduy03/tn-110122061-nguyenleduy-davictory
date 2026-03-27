package com.victory.DAVictory.dto;

import lombok.Data;
import java.util.List;

@Data
public class GuestExamSubmitRequest {
    private Integer timeSpentSeconds;
    private List<AttemptAnswerSave> answers;
}
