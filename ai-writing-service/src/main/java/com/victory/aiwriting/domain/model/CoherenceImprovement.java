package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CoherenceImprovement {
    private String original;
    private String improved;
    private String explanation;
}
