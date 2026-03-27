package com.victory.DAVictory.dto;

import lombok.Data;
import java.util.List;

@Data
public class AnswerBackupRequest {
    private Long attemptId;
    private List<AttemptAnswerSave> answers;
}
