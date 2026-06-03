package com.victory.aispeaking.domain.port;

import java.io.InputStream;

public interface TTSProvider {
    InputStream synthesize(String text, String voiceId);
    byte[] synthesizeBytes(String text, String voiceId);
    boolean isAvailable();
}
