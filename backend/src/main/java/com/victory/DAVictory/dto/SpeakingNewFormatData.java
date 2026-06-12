package com.victory.DAVictory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpeakingNewFormatData {
    private String mode = "BANK"; // "BANK" or "INLINE"

    // === BANK mode ===
    private Long selectedComboId;
    private List<Long> selectedOptionalFrameIds;
    private boolean autoRandomOptionalFrames;

    // === INLINE mode ===
    private List<InlineFrame> frames;
    private InlineCombo combo;

    // === Common ===
    private boolean includeWarmUp = true;
    private int mandatoryQuestionCount = 5;
    private int optionalFrameCount = 2;
    private int optionalQuestionCount = 4;
    private int part3QuestionCount = 5;
}
