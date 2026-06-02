package com.victory.aiwriting.domain.port;

import com.victory.aiwriting.domain.model.PromptContext;

public interface AIProvider {
    String chat(PromptContext prompt);
    boolean isAvailable();
    String getProviderName();
    String getModelName();
}
