package com.victory.DAVictory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InlineFrame {
    private String name;
    private String introPrompt;
    private String frameType;  // MANDATORY / OPTIONAL
    private String profile;    // STUDENT / WORK / BOTH (cho mandatory)
    private List<String> questions;
    private Integer randomCount;
}
