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
        new ModelOption("Llama 3.3 70B (Recommend)", "llama-3.3-70b-versatile", "groq", "https://api.groq.com/openai"),
        new ModelOption("Llama 4 Scout 17B", "meta-llama/llama-4-scout-17b-16e-instruct", "groq", "https://api.groq.com/openai"),
        new ModelOption("Llama 4 Maverick 17B", "meta-llama/llama-4-maverick-17b-128e-instruct", "groq", "https://api.groq.com/openai"),
        new ModelOption("Llama 3.3 70B SpecDec", "llama-3.3-70b-specdec", "groq", "https://api.groq.com/openai"),
        new ModelOption("Llama 3.1 8B Instant", "llama-3.1-8b-instant", "groq", "https://api.groq.com/openai"),
        new ModelOption("Llama 3 8B", "llama3-8b-8192", "groq", "https://api.groq.com/openai"),
        new ModelOption("Mixtral 8x7B", "mixtral-8x7b-32768", "groq", "https://api.groq.com/openai"),
        new ModelOption("Gemma 2 9B", "gemma2-9b-it", "groq", "https://api.groq.com/openai"),
        new ModelOption("Gemma 2 27B", "gemma2-27b-it", "groq", "https://api.groq.com/openai"),
        new ModelOption("DeepSeek R1 Distill Llama 70B", "deepseek-r1-distill-llama-70b", "groq", "https://api.groq.com/openai"),
        new ModelOption("Qwen 2.5 32B", "qwen-2.5-32b", "groq", "https://api.groq.com/openai"),
        new ModelOption("Qwen QwQ 32B", "qwen-qwq-32b", "groq", "https://api.groq.com/openai"),
        new ModelOption("Gemini 2.0 Flash", "gemini-2.0-flash", "gemini", "https://generativelanguage.googleapis.com/v1beta/openai"),
        new ModelOption("Gemini 2.0 Flash Lite", "gemini-2.0-flash-lite", "gemini", "https://generativelanguage.googleapis.com/v1beta/openai"),
        new ModelOption("Gemini 2.5 Pro", "gemini-2.5-pro-exp-03-25", "gemini", "https://generativelanguage.googleapis.com/v1beta/openai"),
        new ModelOption("Gemini 2.5 Flash", "gemini-2.5-flash-preview-04-17", "gemini", "https://generativelanguage.googleapis.com/v1beta/openai")
    );

    private final List<String> groqKeys;
    private final String geminiKey;
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();

    private volatile String provider;
    private volatile String model;
    private volatile String baseUrl;
    private volatile double temperature;
    private volatile int maxTokens;
    private volatile RotatingKeyProvider currentProvider;

    public DynamicAIProvider(List<String> groqKeys, String geminiKey, String baseUrl, String provider, String model, double temperature, int maxTokens) {
        this.groqKeys = groqKeys;
        this.geminiKey = geminiKey;
        this.baseUrl = baseUrl;
        this.provider = provider;
        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
        this.currentProvider = buildProvider();
        log.info("DynamicAIProvider initialized with model: {} ({}), {} API keys", model, provider, groqKeys.size());
    }

    private List<String> resolveKeys() {
        if ("gemini".equalsIgnoreCase(provider)) {
            return geminiKey != null && !geminiKey.isBlank() ? List.of(geminiKey) : List.of();
        }
        return groqKeys;
    }

    private RotatingKeyProvider buildProvider() {
        var keys = resolveKeys();
        var chatModels = keys.stream()
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
