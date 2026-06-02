package com.victory.aiwriting.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AIGradingAuditLogRepository extends JpaRepository<AIGradingAuditLogEntity, Long> {
}
