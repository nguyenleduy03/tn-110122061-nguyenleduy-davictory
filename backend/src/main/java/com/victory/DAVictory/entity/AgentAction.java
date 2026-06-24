package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm AGENT - AGENT ACTION
 * Bảng agent_actions: hàng chờ phê duyệt các hành động do agent đề xuất (human-in-the-loop)
 */
@Entity
@Table(name = "agent_actions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String actionType; // publish_post, delete_post, update_test

    @Column(columnDefinition = "JSON")
    private String payload; // chi tiết hành động (JSON)

    @Column(length = 20)
    private String status; // pending, approved, rejected

    @Column(columnDefinition = "TEXT")
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by")
    private User requestedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime resolvedAt;
}
