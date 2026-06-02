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
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
public class RotatingKeyProvider implements AIProvider {

    private final List<OpenAiChatModel> chatModels;
    private final AtomicInteger currentIndex = new AtomicInteger(0);
    private final String providerName;
    private final String modelName;

    public RotatingKeyProvider(List<OpenAiChatModel> chatModels, String providerName, String modelName) {
        this.chatModels = chatModels;
        this.providerName = providerName;
        this.modelName = modelName;
        log.info("RotatingKeyProvider initialized with {} API keys for model {}", chatModels.size(), modelName);
    }

    @Override
    public String chat(PromptContext prompt) {
        var lastException = new AIProviderException("No API keys available", null);

        for (int attempt = 0; attempt < chatModels.size(); attempt++) {
            int idx = Math.abs(currentIndex.getAndIncrement() % chatModels.size());
            var model = chatModels.get(idx);

            try {
                var systemMsg = new SystemMessage(buildFullPrompt(prompt));
                var userMsg = new UserMessage("Grade the essay following the instructions above.");
                var request = new Prompt(List.of(systemMsg, userMsg));
                var response = model.call(request);
                log.info("AI call succeeded with key index {}", idx);
                return response.getResult().getOutput().getText();
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : "";
                lastException = new AIProviderException("AI call failed with key " + idx + ": " + msg, e);

                if (msg.contains("429") || msg.contains("rate_limit") || msg.contains("Rate limit")) {
                    log.warn("Key {} rate limited, rotating to next key...", idx);
                    continue;
                }
                log.error("Key {} failed with non-rate-limit error: {}", idx, msg);
                throw lastException;
            }
        }

        log.error("All {} API keys exhausted due to rate limiting", chatModels.size());
        throw lastException;
    }

    @Override
    public boolean isAvailable() {
        return chatModels != null && !chatModels.isEmpty();
    }

    @Override
    public String getProviderName() {
        return providerName;
    }

    @Override
    public String getModelName() {
        return modelName;
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
