package com.victory.aiwriting.infrastructure.persistence;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_grading_audit_logs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AIGradingAuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "grading_result_id")
    private Long gradingResultId;

    @Column(length = 30)
    private String provider;

    @Column(length = 50)
    private String model;

    @Column(name = "system_prompt", columnDefinition = "LONGTEXT")
    private String systemPrompt;

    @Column(name = "user_prompt", columnDefinition = "LONGTEXT")
    private String userPrompt;

    @Column(name = "raw_response", columnDefinition = "LONGTEXT")
    private String rawResponse;

    @Column(name = "prompt_tokens")
    private Integer promptTokens;

    @Column(name = "completion_tokens")
    private Integer completionTokens;

    @Column(name = "latency_ms")
    private Long latencyMs;

    @Column(nullable = false)
    private Boolean success;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "triggered_by")
    private String triggeredBy;

    @Column(name = "trigger_source", length = 30)
    @Builder.Default
    private String triggerSource = "MANUAL";

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
