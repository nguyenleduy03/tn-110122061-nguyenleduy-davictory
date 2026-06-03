package com.victory.aispeaking.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class SpeechSegmentDTO {
    private String text;
    private double confidence;
    private String language;
    private boolean isFinal;
}
