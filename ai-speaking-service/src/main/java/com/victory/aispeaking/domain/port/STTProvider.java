package com.victory.aispeaking.domain.port;

import com.victory.aispeaking.domain.model.SpeechSegment;

import java.io.InputStream;
import java.util.List;

public interface STTProvider {
    SpeechSegment transcribe(InputStream audioStream, String mimeType);
    List<SpeechSegment> transcribeWithTimestamps(InputStream audioStream, String mimeType);
    boolean isAvailable();
}
