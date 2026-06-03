package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class StructureFeedback {
    private String taskType;
    private List<String> keyTips;
    private List<Map<String, String>> recommendedOutline;
}
