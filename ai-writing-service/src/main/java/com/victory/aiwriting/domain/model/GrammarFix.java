package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GrammarFix {
    private String original;
    private String correction;
    private String explanation;
    private String location;
}
