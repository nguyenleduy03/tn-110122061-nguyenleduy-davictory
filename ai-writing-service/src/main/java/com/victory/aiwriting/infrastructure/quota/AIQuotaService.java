package com.victory.aiwriting.infrastructure.quota;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.victory.aiwriting.config.AIConfigProperties;
import com.victory.aiwriting.exception.AIQuotaExceededException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class AIQuotaService {

    private final AIConfigProperties config;
    private Cache<String, Integer> quotaCache;

    @PostConstruct
    void init() {
        quotaCache = Caffeine.newBuilder()
            .expireAfterWrite(1, TimeUnit.DAYS)
            .build();
    }

    public void checkQuota(String userId, String role) {
        var maxQuota = config.getQuota().getQuotaForRole(role);
        if (maxQuota <= 0) {
            throw new AIQuotaExceededException("No quota for role: " + role);
        }

        var key = userId + ":" + role;
        var count = quotaCache.get(key, k -> 0);

        if (count >= maxQuota) {
            throw new AIQuotaExceededException(
                "Daily quota exceeded. Maximum " + maxQuota + " requests/day for " + role);
        }

        quotaCache.put(key, count + 1);
    }

    public int getRemainingQuota(String userId, String role) {
        var key = userId + ":" + role;
        var count = quotaCache.get(key, k -> 0);
        return config.getQuota().getQuotaForRole(role) - count;
    }
}
