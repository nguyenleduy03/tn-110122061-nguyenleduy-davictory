package com.victory.aispeaking.domain.port;

import java.io.InputStream;
import java.net.URL;

public interface AudioStorePort {
    URL store(String sessionId, int turnNumber, String prefix, byte[] audioData, String mimeType);
    InputStream retrieve(String url);
    boolean delete(String url);
    long getStorageQuota();
}
