package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.AgentAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgentActionRepository extends JpaRepository<AgentAction, Long> {
    List<AgentAction> findByStatusOrderByCreatedAtDesc(String status);
}
