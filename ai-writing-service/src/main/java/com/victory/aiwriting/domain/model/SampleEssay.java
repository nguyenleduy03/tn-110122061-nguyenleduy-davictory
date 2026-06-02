package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SampleEssay {
    private Long id;
    private String taskType;
    private String topic;
    private String promptText;
    private String essayText;
    private Double bandScore;
    private String examinerComment;
    private boolean hasComment;
    private int wordCount;
}
