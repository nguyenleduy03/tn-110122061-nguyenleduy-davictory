package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CriterionSubScore {
    private String name;
    private int score;
    private String feedback;
}
