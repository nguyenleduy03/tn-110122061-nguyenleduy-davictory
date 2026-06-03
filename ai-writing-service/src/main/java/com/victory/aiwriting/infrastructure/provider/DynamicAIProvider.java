package com.victory.aiwriting.infrastructure.provider;

import com.victory.aiwriting.domain.model.PromptContext;
import com.victory.aiwriting.domain.port.AIProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;

import java.util.List;
import java.util.concurrent.locks.ReentrantReadWriteLock;

@Slf4j
public class DynamicAIProvider implements AIProvider {

    public record ModelOption(String label, String model, String provider, String baseUrl) {}

    public static final List<ModelOption> AVAILABLE_MODELS = List.of(
        new ModelOption("Llama 3.3 70B", "llama-3.3-70b-versatile", "groq", "https://api.groq.com/openai"),
        new ModelOption("Llama 4 Scout 17B", "meta-llama/llama-4-scout-17b-16e-instruct", "groq", "https://api.groq.com/openai"),
        new ModelOption("Llama 3.1 8B (Instant)", "llama-3.1-8b-instant", "groq", "https://api.groq.com/openai")
    );

    private final List<String> apiKeys;
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();

    private volatile String provider;
    private volatile String model;
    private volatile String baseUrl;
    private volatile double temperature;
    private volatile int maxTokens;
    private volatile RotatingKeyProvider currentProvider;

    public DynamicAIProvider(List<String> apiKeys, String baseUrl, String provider, String model, double temperature, int maxTokens) {
        this.apiKeys = apiKeys;
        this.baseUrl = baseUrl;
        this.provider = provider;
        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
        this.currentProvider = buildProvider();
        log.info("DynamicAIProvider initialized with model: {} ({}), {} API keys", model, provider, apiKeys.size());
    }

    private RotatingKeyProvider buildProvider() {
        var chatModels = apiKeys.stream()
            .map(key -> {
                var api = OpenAiApi.builder()
                    .apiKey(key)
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
            })
            .toList();
        return new RotatingKeyProvider(chatModels, provider, model);
    }

    public void switchModel(String newModel, String newProvider, String newBaseUrl) {
        lock.writeLock().lock();
        try {
            this.model = newModel;
            this.provider = newProvider;
            this.baseUrl = newBaseUrl;
            this.currentProvider = buildProvider();
            log.info("Switched AI model to: {} (provider: {})", newModel, newProvider);
        } finally {
            lock.writeLock().unlock();
        }
    }

    public void switchModel(String newModel) {
        var opt = AVAILABLE_MODELS.stream()
            .filter(m -> m.model().equals(newModel))
            .findFirst();
        if (opt.isPresent()) {
            var m = opt.get();
            switchModel(m.model(), m.provider(), m.baseUrl());
        } else {
            lock.writeLock().lock();
            try {
                this.model = newModel;
                this.currentProvider = buildProvider();
                log.info("Switched AI model to: {} (custom)", newModel);
            } finally {
                lock.writeLock().unlock();
            }
        }
    }

    @Override
    public String chat(PromptContext prompt) {
        lock.readLock().lock();
        try {
            return currentProvider.chat(prompt);
        } finally {
            lock.readLock().unlock();
        }
    }

    @Override
    public boolean isAvailable() {
        lock.readLock().lock();
        try {
            return currentProvider.isAvailable();
        } finally {
            lock.readLock().unlock();
        }
    }

    @Override
    public String getProviderName() {
        return provider;
    }

    @Override
    public String getModelName() {
        return model;
    }
}
