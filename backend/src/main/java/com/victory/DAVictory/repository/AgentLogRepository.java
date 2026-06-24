package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.AgentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AgentLogRepository extends JpaRepository<AgentLog, Long> {
}
