package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Nhóm AGENT - AGENT LOG
 * Bảng agent_logs: lịch sử tương tác của agent với người dùng
 */
@Entity
@Table(name = "agent_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 50)
    private String action; // chat, write_post, generate_report

    @Column(columnDefinition = "TEXT")
    private String requestMessage;

    @Column(columnDefinition = "TEXT")
    private String responseSummary;

    @Column(length = 20)
    private String status; // success, error, pending_approval

    private Integer inputTokens;

    private Integer outputTokens;

    @ElementCollection
    @CollectionTable(name = "agent_log_tools", joinColumns = @JoinColumn(name = "log_id"))
    @Column(name = "tool_name", length = 100)
    private List<String> toolsUsed = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
