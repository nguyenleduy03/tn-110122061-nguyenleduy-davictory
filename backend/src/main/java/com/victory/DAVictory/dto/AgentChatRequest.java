package com.victory.DAVictory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentChatRequest {
    private String message;
    private Long session_id;
    private Boolean agent_mode;
    private String mode;
}
