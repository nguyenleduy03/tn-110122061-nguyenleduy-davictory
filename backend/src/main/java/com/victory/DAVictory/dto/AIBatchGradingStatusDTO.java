package com.victory.DAVictory.dto;

import lombok.Data;
import java.util.List;

@Data
public class AIBatchGradingStatusDTO {
    private String batchId;
    private int total;
    private int completed;
    private int failed;
    private String status;
    private List<AIGradingResponseDTO> results;
}
