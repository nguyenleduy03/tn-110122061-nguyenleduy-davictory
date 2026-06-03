package com.victory.aispeaking.domain.port;

import com.victory.aispeaking.domain.model.PromptContext;

public interface AIProvider {
    String chat(PromptContext context);
    boolean isAvailable();
    String getProviderName();
    String getModelName();
}
