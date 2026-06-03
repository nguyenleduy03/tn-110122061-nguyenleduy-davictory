package com.victory.aispeaking.infrastructure.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.victory.aispeaking.config.AIConfigProperties;
import com.victory.aispeaking.domain.model.SpeechSegment;
import com.victory.aispeaking.domain.port.STTProvider;
import lombok.extern.slf4j.Slf4j;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
public class WhisperSTTProvider implements STTProvider {

    private final AIConfigProperties config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public WhisperSTTProvider(AIConfigProperties config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(30))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public SpeechSegment transcribe(InputStream audioStream, String mimeType) {
        try {
            byte[] audioBytes = readAllBytes(audioStream);
            String apiKey = getApiKey();
            String responseFormat = config.getStt().getResponseFormat();
            String boundary = "----" + System.currentTimeMillis();

            String body = buildMultipartBody(
                    audioBytes, boundary, config.getStt().getModel(),
                    config.getStt().getLanguage(), responseFormat);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/audio/transcriptions"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body.getBytes(StandardCharsets.UTF_8)))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return parseResponse(response.body());
            } else {
                log.error("Whisper API error: {} - {}", response.statusCode(), response.body());
                return SpeechSegment.builder().text("").confidence(0)
                        .language(config.getStt().getLanguage()).isFinal(true).build();
            }
        } catch (Exception e) {
            log.error("STT failed: {}", e.getMessage());
            return SpeechSegment.builder().text("").confidence(0)
                    .language(config.getStt().getLanguage()).isFinal(true).build();
        }
    }

    @Override
    public List<SpeechSegment> transcribeWithTimestamps(InputStream audioStream, String mimeType) {
        SpeechSegment segment = transcribe(audioStream, mimeType);
        return List.of(segment);
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    public List<Map<String, Object>> getWordLevelConfidence(InputStream audioStream, String mimeType) {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            byte[] audioBytes = readAllBytes(audioStream);
            String apiKey = getApiKey();
            String boundary = "----" + System.currentTimeMillis();

            String body = buildMultipartBody(
                    audioBytes, boundary, config.getStt().getModel(),
                    config.getStt().getLanguage(), "verbose_json");

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/audio/transcriptions"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body.getBytes(StandardCharsets.UTF_8)))
                    .build();

            HttpResponse<String> httpResponse = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());

            if (httpResponse.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(httpResponse.body());
                JsonNode words = root.path("words");
                if (words.isArray()) {
                    for (JsonNode w : words) {
                        result.add(Map.of(
                                "word", w.path("word").asText(""),
                                "confidence", w.path("confidence").asDouble(0),
                                "start", w.path("start").asDouble(0),
                                "end", w.path("end").asDouble(0)
                        ));
                    }
                }
            }
        } catch (Exception e) {
            log.error("Word-level confidence extraction failed: {}", e.getMessage());
        }
        return result;
    }

    private SpeechSegment parseResponse(String jsonResponse) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            String text = root.path("text").asText("");
            double confidence = 1.0;

            JsonNode segments = root.path("segments");
            if (segments.isArray() && segments.size() > 0) {
                double avgConfidence = 0;
                int count = 0;
                for (JsonNode seg : segments) {
                    if (seg.has("confidence")) {
                        avgConfidence += seg.path("confidence").asDouble(0);
                        count++;
                    }
                }
                if (count > 0) confidence = avgConfidence / count;
            }

            return SpeechSegment.builder()
                    .text(text)
                    .confidence(Math.round(confidence * 100.0) / 100.0)
                    .language(config.getStt().getLanguage())
                    .isFinal(true)
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse Whisper verbose response: {}", e.getMessage());
            return SpeechSegment.builder().text(jsonResponse)
                    .confidence(1.0).language(config.getStt().getLanguage())
                    .isFinal(true).build();
        }
    }

    private String buildMultipartBody(byte[] audioBytes, String boundary,
                                       String model, String language, String responseFormat) {
        StringBuilder sb = new StringBuilder();
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"file\"; filename=\"audio.webm\"\r\n");
        sb.append("Content-Type: audio/webm\r\n\r\n");
        sb.append(new String(audioBytes, StandardCharsets.ISO_8859_1)).append("\r\n");

        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"model\"\r\n\r\n");
        sb.append(model).append("\r\n");

        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"language\"\r\n\r\n");
        sb.append(language).append("\r\n");

        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"response_format\"\r\n\r\n");
        sb.append(responseFormat).append("\r\n");

        sb.append("--").append(boundary).append("--\r\n");
        return sb.toString();
    }

    private String getApiKey() {
        List<String> keys = config.getScoring().getApiKeys();
        if (keys != null && !keys.isEmpty()) return keys.get(0);
        return System.getenv("OPENAI_API_KEY");
    }

    private byte[] readAllBytes(InputStream inputStream) {
        try {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] data = new byte[8192];
            int nRead;
            while ((nRead = inputStream.read(data)) != -1) {
                buffer.write(data, 0, nRead);
            }
            return buffer.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to read audio stream", e);
        }
    }
}
