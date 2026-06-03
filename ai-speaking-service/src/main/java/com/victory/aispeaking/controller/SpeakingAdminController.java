package com.victory.aispeaking.controller;

import com.victory.aispeaking.config.AIConfigProperties;
import com.victory.aispeaking.domain.model.SpeakingRubric;
import com.victory.aispeaking.domain.service.RubricLoader;
import com.victory.aispeaking.infrastructure.cache.SpeakingCacheService;
import com.victory.aispeaking.infrastructure.cache.SpeakingCacheService.CacheStats;
import com.victory.aispeaking.infrastructure.quota.AIQuotaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/speaking")
@RequiredArgsConstructor
public class SpeakingAdminController {

    private final AIConfigProperties config;
    private final RubricLoader rubricLoader;
    private final SpeakingCacheService cacheService;
    private final AIQuotaService quotaService;

    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        return ResponseEntity.ok(Map.of(
            "conversation", Map.of(
                "provider", config.getConversation().getProvider(),
                "model", config.getConversation().getModel(),
                "temperature", config.getConversation().getTemperature()
            ),
            "scoring", Map.of(
                "provider", config.getScoring().getProvider(),
                "model", config.getScoring().getModel(),
                "temperature", config.getScoring().getTemperature()
            ),
            "features", config.getFeatures(),
            "quota", config.getQuota(),
            "cache", Map.of("enabled", config.getCache().isEnabled(),
                           "maxSize", config.getCache().getMaxSize(),
                           "ttlMinutes", config.getCache().getTtlMinutes()),
            "stt", Map.of("model", config.getStt().getModel(),
                         "responseFormat", config.getStt().getResponseFormat()),
            "tts", Map.of("model", config.getTts().getModel(),
                         "voice", config.getTts().getVoice()),
            "pronunciation", config.getPronunciation()
        ));
    }

    @GetMapping("/rubric")
    public ResponseEntity<?> getRubric() {
        SpeakingRubric rubric = rubricLoader.loadIELTSRubric();
        return ResponseEntity.ok(Map.of(
            "criteriaBands", rubric.getCriteriaBands().keySet(),
            "rubricSummary", rubric.getRubricSummary()
        ));
    }

    @GetMapping("/cache/stats")
    public ResponseEntity<?> getCacheStats() {
        CacheStats stats = cacheService.getStats();
        return ResponseEntity.ok(Map.of(
            "hits", stats.hits(),
            "misses", stats.misses(),
            "hitRate", stats.hitRate(),
            "estimatedSize", stats.estimatedSize()
        ));
    }

    @PostMapping("/cache/clear")
    public ResponseEntity<?> clearCache() {
        cacheService.clear();
        return ResponseEntity.ok(Map.of("message", "Cache cleared"));
    }

    @PostMapping("/quota/reset")
    public ResponseEntity<?> resetQuotas() {
        quotaService.resetAllQuotas();
        return ResponseEntity.ok(Map.of("message", "All quotas reset"));
    }
}
