package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PromptContext {
    private String systemPrompt;
    private String rubricSection;
    private String fewShotSection;
    private String userSection;
    private String outputSchema;
    private int estimatedTokens;

    public String toFullPrompt() {
        return String.join("\n\n",
            systemPrompt,
            rubricSection,
            fewShotSection,
            userSection
        );
    }
}
