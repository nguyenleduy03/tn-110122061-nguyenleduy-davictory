package com.victory.aispeaking.infrastructure.provider;

import com.victory.aispeaking.domain.model.PromptContext;
import com.victory.aispeaking.domain.port.AIProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
public class ScoringAIProvider implements AIProvider {

    private final List<String> apiKeys;
    private final AtomicInteger currentIndex = new AtomicInteger(0);

    private volatile String baseUrl;
    private volatile String model;
    private volatile double temperature;
    private volatile int maxTokens;

    public ScoringAIProvider(List<String> apiKeys, String baseUrl, String model,
                              double temperature, int maxTokens) {
        this.apiKeys = apiKeys;
        this.baseUrl = baseUrl;
        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
        log.info("ScoringAIProvider initialized with model: {} at {}", model, baseUrl);
    }

    @Override
    public String chat(PromptContext context) {
        OpenAiChatModel chatModel = buildModel(getNextKey());

        try {
            Prompt springPrompt = new Prompt(List.of(
                    new SystemMessage(context.getSystemPrompt()),
                    new UserMessage(context.getUserSection())
            ));

            ChatResponse response = chatModel.call(springPrompt);
            return response.getResult().getOutput().getText();
        } catch (Exception e) {
            log.error("Scoring AI call failed, rotating key... {}", e.getMessage());
            currentIndex.incrementAndGet();
            OpenAiChatModel nextModel = buildModel(getNextKey());
            Prompt springPrompt = new Prompt(List.of(
                    new SystemMessage(context.getSystemPrompt()),
                    new UserMessage(context.getUserSection())
            ));
            ChatResponse response = nextModel.call(springPrompt);
            return response.getResult().getOutput().getText();
        }
    }

    @Override
    public boolean isAvailable() {
        return apiKeys != null && !apiKeys.isEmpty();
    }

    @Override
    public String getProviderName() {
        return "openai";
    }

    @Override
    public String getModelName() {
        return model;
    }

    private OpenAiChatModel buildModel(String apiKey) {
        OpenAiApi api = OpenAiApi.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .build();

        return OpenAiChatModel.builder()
                .openAiApi(api)
                .defaultOptions(OpenAiChatOptions.builder()
                        .model(model)
                        .temperature(temperature)
                        .maxTokens(maxTokens)
                        .build())
                .build();
    }

    private String getNextKey() {
        int index = Math.abs(currentIndex.getAndIncrement()) % apiKeys.size();
        return apiKeys.get(index);
    }
}
