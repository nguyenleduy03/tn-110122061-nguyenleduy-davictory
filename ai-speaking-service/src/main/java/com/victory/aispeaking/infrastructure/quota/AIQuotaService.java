package com.victory.aispeaking.infrastructure.quota;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.victory.aispeaking.config.AIConfigProperties;
import com.victory.aispeaking.exception.QuotaExceededException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class AIQuotaService {

    private final AIConfigProperties config;
    private Cache<String, Integer> quotaCache;

    public AIQuotaService(AIConfigProperties config) {
        this.config = config;
    }

    @PostConstruct
    public void init() {
        this.quotaCache = Caffeine.newBuilder()
                .expireAfterWrite(1, TimeUnit.DAYS)
                .maximumSize(10000)
                .build();
    }

    public void checkQuota(Long userId, String role) {
        String key = buildKey(userId, role);
        Integer used = quotaCache.getIfPresent(key);
        int limit = config.getQuota().getQuotaForRole(role);

        if (used != null && used >= limit) {
            throw new QuotaExceededException(
                    "Daily quota exceeded for user " + userId + ". Limit: " + limit + " requests/day. Role: " + role);
        }
    }

    public int incrementAndGet(Long userId, String role) {
        String key = buildKey(userId, role);
        Integer used = quotaCache.getIfPresent(key);
        int newCount = (used == null ? 0 : used) + 1;
        quotaCache.put(key, newCount);
        return newCount;
    }

    public int getRemainingQuota(Long userId, String role) {
        String key = buildKey(userId, role);
        Integer used = quotaCache.getIfPresent(key);
        int limit = config.getQuota().getQuotaForRole(role);
        return limit - (used == null ? 0 : used);
    }

    public void resetQuota(Long userId, String role) {
        String key = buildKey(userId, role);
        quotaCache.invalidate(key);
    }

    public void resetAllQuotas() {
        quotaCache.invalidateAll();
        log.info("All daily quotas reset");
    }

    private String buildKey(Long userId, String role) {
        return userId + ":" + role.toUpperCase() + ":" + LocalDate.now();
    }
}
