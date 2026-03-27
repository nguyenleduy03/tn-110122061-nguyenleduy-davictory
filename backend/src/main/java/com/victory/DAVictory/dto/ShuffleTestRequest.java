package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.enums.TestType;
import lombok.Data;

import java.util.List;

@Data
public class ShuffleTestRequest {
    private String title;
    private String description;
    private TestType testType;
    private Boolean isFullTest;
    private String shuffleMode;
    private SkillType skillType;
    private List<Long> partIds;
    private String shuffleSource;
    private List<Long> sourceTestIds;
    private TestFilterRequest filterCriteria;
    private Long createdByUserId;
}
