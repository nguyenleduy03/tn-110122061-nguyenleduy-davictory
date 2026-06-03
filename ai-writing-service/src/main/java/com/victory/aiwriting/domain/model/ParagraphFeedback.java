package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;
import java.util.Map;

@Data
@Builder
public class ParagraphFeedback {
    private String type;
    private String originalText;
    private String feedback;
    private Map<String, String> criteriaComments;
    private String rewriteSuggestion;
}
