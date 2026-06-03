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
import java.util.concurrent.locks.ReentrantReadWriteLock;

@Slf4j
public class DynamicAIProvider implements AIProvider {

    private final List<String> apiKeys;
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    private final AtomicInteger currentIndex = new AtomicInteger(0);

    private volatile String provider;
    private volatile String model;
    private volatile String baseUrl;
    private volatile double temperature;
    private volatile int maxTokens;

    public DynamicAIProvider(List<String> apiKeys, String baseUrl, String provider,
                             String model, double temperature, int maxTokens) {
        this.apiKeys = apiKeys;
        this.baseUrl = baseUrl;
        this.provider = provider;
        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
        log.info("DynamicAIProvider initialized with model: {} ({}), {} API keys", model, provider, apiKeys.size());
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
            log.error("AI call failed with key index {}, rotating...", currentIndex.get() % apiKeys.size());
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
        return provider;
    }

    @Override
    public String getModelName() {
        return model;
    }

    public void switchModel(String modelName) {
        this.model = modelName;
        log.info("Switched model to: {}", modelName);
    }

    public void switchProvider(String providerName, String newBaseUrl) {
        this.provider = providerName;
        this.baseUrl = newBaseUrl;
        log.info("Switched provider to: {} at {}", providerName, newBaseUrl);
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
