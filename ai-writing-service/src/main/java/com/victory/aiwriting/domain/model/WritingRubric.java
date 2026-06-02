package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class WritingRubric {
    private String taskType;
    private List<RubricBand> taskResponse;
    private List<RubricBand> coherenceCohesion;
    private List<RubricBand> lexicalResource;
    private List<RubricBand> grammaticalRange;
    private Map<String, String> rubricSummary;
}
