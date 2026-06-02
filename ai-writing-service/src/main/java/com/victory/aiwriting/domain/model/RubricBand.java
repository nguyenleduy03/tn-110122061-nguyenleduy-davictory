package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class RubricBand {
    private double band;
    private String descriptor;
    private String summary;
    private List<String> keyIndicators;
    private List<String> commonErrors;
}
