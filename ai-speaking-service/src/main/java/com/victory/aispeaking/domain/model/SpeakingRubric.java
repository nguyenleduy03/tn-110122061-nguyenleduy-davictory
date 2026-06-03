package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;

@Value
@Builder
public class SpeakingRubric {
    Map<String, List<RubricBand>> criteriaBands;
    Map<String, String> rubricSummary;
}
