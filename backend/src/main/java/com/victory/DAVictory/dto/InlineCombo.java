package com.victory.DAVictory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InlineCombo {
    private String title;
    private String cueCardPrompt;
    private List<String> bulletPoints;
    private List<String> followUpQuestions;
    private Integer randomFollowUpCount;
    private List<String> part3Questions;
    private Integer part3RandomCount;
}
