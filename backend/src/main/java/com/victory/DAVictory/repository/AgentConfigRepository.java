package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.AgentConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AgentConfigRepository extends JpaRepository<AgentConfig, Long> {
    Optional<AgentConfig> findByToolName(String toolName);
}
