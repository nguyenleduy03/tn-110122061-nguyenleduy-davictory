package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm AGENT - AGENT CONFIG
 * Bảng agent_configs: cấu hình model/temperature cho từng tool agent
 */
@Entity
@Table(name = "agent_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String toolName; // __default__ hoặc tên tool cụ thể

    @Column(length = 100)
    private String model; // Groq model name

    @Column(nullable = false)
    private Double temperature = 0.1;

    @Column(columnDefinition = "TEXT")
    private String systemPrompt; // custom prompt override

    @Column(nullable = false)
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
