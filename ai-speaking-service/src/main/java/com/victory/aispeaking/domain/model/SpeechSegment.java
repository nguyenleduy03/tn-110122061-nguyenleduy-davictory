package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SpeechSegment {
    String text;
    double confidence;
    String language;
    int durationMs;
    boolean isFinal;
}
