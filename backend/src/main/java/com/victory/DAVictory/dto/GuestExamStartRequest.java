package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.SkillType;
import lombok.Data;

@Data
public class GuestExamStartRequest {
    private String fullName;
    private String email;
    private String phone;
    private Long testId;
    private SkillType skillType;
    private Integer timeLimitSeconds;
}
