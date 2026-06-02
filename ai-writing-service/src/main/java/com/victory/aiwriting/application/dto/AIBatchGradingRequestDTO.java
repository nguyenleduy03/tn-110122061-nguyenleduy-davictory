package com.victory.aiwriting.application.dto;

import lombok.Data;
import java.util.List;

@Data
public class AIBatchGradingRequestDTO {
    private List<Long> submissionIds;
}
