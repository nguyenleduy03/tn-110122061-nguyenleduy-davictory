package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm AGENT - AGENT TASK
 * Bảng agent_tasks: tác vụ được giao cho agent xử lý
 */
@Entity
@Table(name = "agent_tasks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private AgentSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 50)
    private String agentType; // content, info, report, email

    @Column(length = 200)
    private String intent;

    @Column(columnDefinition = "JSON")
    private String inputData;

    @Column(length = 20)
    private String status; // pending, processing, completed, failed

    @Column(columnDefinition = "JSON")
    private String result;

    @Column(columnDefinition = "JSON")
    private String plan;

    @Column(columnDefinition = "TEXT")
    private String error;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime completedAt;
}
