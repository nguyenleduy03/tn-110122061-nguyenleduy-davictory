package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.SkillType;
import lombok.Data;

import java.util.List;

@Data
public class TestAttemptRequest {
    private Long testId;
    private List<SkillType> skills; // null = full test, có giá trị = single/multiple skills
    private Integer timeLimitMinutes;
    private Boolean isPractice; // true = thi thử, false = thi chính thức
}
