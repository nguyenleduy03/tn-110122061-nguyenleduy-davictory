package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PromptContext {
    String systemPrompt;
    String rubricSection;
    String userSection;
    String outputSchema;
    String featureSection;
    int estimatedTokens;
}
