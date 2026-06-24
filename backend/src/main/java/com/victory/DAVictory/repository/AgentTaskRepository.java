package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.AgentTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgentTaskRepository extends JpaRepository<AgentTask, Long> {
    List<AgentTask> findBySessionIdOrderById(Long sessionId);
}
