package com.victory.aiwriting.infrastructure.provider;

import com.victory.aiwriting.domain.model.PromptContext;
import com.victory.aiwriting.domain.port.AIProvider;
import com.victory.aiwriting.exception.AIProviderException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatModel;

import java.util.List;

@Slf4j
public class OpenAIChatProvider implements AIProvider {

    private final OpenAiChatModel chatModel;

    public OpenAIChatProvider(OpenAiChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @Override
    public String chat(PromptContext prompt) {
        try {
            var systemMsg = new SystemMessage(buildFullPrompt(prompt));
            var userMsg = new UserMessage("Grade the essay following the instructions above.");
            var request = new Prompt(List.of(systemMsg, userMsg));
            var response = chatModel.call(request);
            return response.getResult().getOutput().getText();
        } catch (Exception e) {
            throw new AIProviderException("AI call failed: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean isAvailable() {
        return chatModel != null;
    }

    @Override
    public String getProviderName() {
        return "groq";
    }

    @Override
    public String getModelName() {
        return "llama-3.3-70b-versatile";
    }

    private String buildFullPrompt(PromptContext ctx) {
        return String.join("\n\n",
            ctx.getSystemPrompt(),
            ctx.getRubricSection(),
            ctx.getFewShotSection(),
            ctx.getUserSection()
        );
    }
}
