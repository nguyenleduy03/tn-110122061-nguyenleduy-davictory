package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class ConversationContext {
    String systemPrompt;
    String partInstructions;
    String conversationHistory;
    String nextQuestion;
    String sessionSeed;
    String topicVariation;
    SessionConfig config;
    int remainingTurns;

    public String toFullPrompt() {
        StringBuilder sb = new StringBuilder();
        sb.append(systemPrompt).append("\n\n");
        if (partInstructions != null && !partInstructions.isEmpty()) {
            sb.append("## Part Instructions\n").append(partInstructions).append("\n\n");
        }
        sb.append("## Configuration\n");
        sb.append("- Target level: ").append(config.getTargetLevel()).append("\n");
        sb.append("- Practice mode: ").append(config.getPracticeMode()).append("\n");
        sb.append("- AI role: ").append(config.getAiRole()).append("\n");
        sb.append("- Response style: ").append(config.getResponseStyle()).append("\n\n");
        if (conversationHistory != null && !conversationHistory.isEmpty()) {
            sb.append("## Conversation History\n").append(conversationHistory).append("\n\n");
        }
        if (nextQuestion != null && !nextQuestion.isEmpty()) {
            sb.append("## Next Question\n").append(nextQuestion).append("\n");
        }
        return sb.toString();
    }
}
