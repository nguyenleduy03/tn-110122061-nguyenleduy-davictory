package com.victory.DAVictory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentConfigRequest {
    private String toolName;
    private String model;
    private Double temperature;
    private String systemPrompt;
    private Boolean isActive;
}
