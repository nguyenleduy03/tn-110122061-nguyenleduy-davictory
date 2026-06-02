package com.victory.aiwriting.application.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AIGradingHistoryDTO {
    private Long id;
    private Long submissionId;
    private Double overallBand;
    private String provider;
    private String status;
    private String approvedBy;
    private LocalDateTime createdAt;
}
