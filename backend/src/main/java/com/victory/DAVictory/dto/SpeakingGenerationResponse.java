package com.victory.DAVictory.dto;

import com.victory.DAVictory.entity.SpeakingCombo;
import com.victory.DAVictory.entity.SpeakingFrame;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingGenerationResponse {
    private List<WarmUpQuestion> warmUpQuestions;
    private List<SpeakingFrame> part1Frames;
    private SpeakingCombo combo;
}
