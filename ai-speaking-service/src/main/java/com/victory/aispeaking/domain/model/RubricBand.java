package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class RubricBand {
    int band;
    String descriptor;
    String summary;
    List<String> keyIndicators;
}
