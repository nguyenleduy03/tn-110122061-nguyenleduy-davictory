package com.victory.aispeaking.infrastructure.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.victory.aispeaking.config.AIConfigProperties;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class SpeakingCacheService {

    private final AIConfigProperties config;
    private Cache<String, Object> cache;

    public SpeakingCacheService(AIConfigProperties config) {
        this.config = config;
    }

    @PostConstruct
    public void init() {
        if (config.getCache().isEnabled()) {
            this.cache = Caffeine.newBuilder()
                    .maximumSize(config.getCache().getMaxSize())
                    .expireAfterWrite(config.getCache().getTtlMinutes(), TimeUnit.MINUTES)
                    .recordStats()
                    .build();
            log.info("Speaking cache initialized with maxSize={}, ttl={}min",
                    config.getCache().getMaxSize(), config.getCache().getTtlMinutes());
        }
    }

    @SuppressWarnings("unchecked")
    public <T> T get(String key, Class<T> type) {
        if (cache == null) return null;
        Object value = cache.getIfPresent(key);
        if (value != null && type.isInstance(value)) {
            return (T) value;
        }
        return null;
    }

    public void put(String key, Object value) {
        if (cache != null) {
            cache.put(key, value);
        }
    }

    public void evict(String key) {
        if (cache != null) {
            cache.invalidate(key);
        }
    }

    public void clear() {
        if (cache != null) {
            cache.invalidateAll();
            log.info("Speaking cache cleared");
        }
    }

    public CacheStats getStats() {
        if (cache == null) return new CacheStats(0, 0, 0, 0);
        var stats = cache.stats();
        return new CacheStats(
                stats.hitCount(),
                stats.missCount(),
                stats.hitRate(),
                cache.estimatedSize()
        );
    }

    public record CacheStats(long hits, long misses, double hitRate, long estimatedSize) {}
}
