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
public class SpeakingBankDataDTO {
    private List<SpeakingFrame> frames;
    private List<SpeakingCombo> combos;
}
