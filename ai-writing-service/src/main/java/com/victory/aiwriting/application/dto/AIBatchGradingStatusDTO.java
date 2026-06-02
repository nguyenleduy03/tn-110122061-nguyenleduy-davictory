package com.victory.aiwriting.application.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class AIBatchGradingStatusDTO {
    private String batchId;
    private int total;
    private int completed;
    private int failed;
    private String status;
    private List<AIGradingResponseDTO> results;
}
