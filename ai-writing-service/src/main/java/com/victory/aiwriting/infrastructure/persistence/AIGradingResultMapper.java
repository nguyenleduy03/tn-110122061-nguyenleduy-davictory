package com.victory.aiwriting.infrastructure.persistence;

import com.victory.aiwriting.domain.model.AIGradingResult;

public class AIGradingResultMapper {

    public static AIGradingResultEntity toEntity(AIGradingResult result) {
        return AIGradingResultEntity.from(result);
    }

    public static AIGradingResult toDomain(AIGradingResultEntity entity) {
        return entity.toDomain();
    }
}
