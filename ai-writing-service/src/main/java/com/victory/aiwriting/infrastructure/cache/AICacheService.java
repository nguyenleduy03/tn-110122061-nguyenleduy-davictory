package com.victory.aiwriting.infrastructure.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.victory.aiwriting.domain.model.AIGradingResult;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class AICacheService {

    private Cache<String, AIGradingResult> cache;

    @PostConstruct
    void init() {
        cache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(24, TimeUnit.HOURS)
            .recordStats()
            .build();
    }

    public void put(String key, AIGradingResult result) {
        cache.put(key, result);
        log.debug("Cached result for key: {}", key);
    }

    public AIGradingResult get(String key) {
        var result = cache.getIfPresent(key);
        if (result != null) {
            log.debug("Cache hit for key: {}", key);
        }
        return result;
    }

    public void evict(String key) {
        cache.invalidate(key);
    }

    public void clear() {
        cache.invalidateAll();
    }

    public CacheStats getStats() {
        var stats = cache.stats();
        return new CacheStats(stats.hitCount(), stats.missCount(), stats.hitRate());
    }

    public record CacheStats(long hits, long misses, double hitRate) {}
}
