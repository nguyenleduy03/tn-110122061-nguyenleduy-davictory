package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.SkillType;
import lombok.Data;

@Data
public class ExamAttemptStartRequest {

    private Long testId;
    private SkillType skillType;
    private Integer timeLimitSeconds;
}
