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
    private Boolean autoRandomOptionalFrames;

    // === INLINE mode ===
    private List<InlineFrame> frames;
    private InlineCombo combo;

    // === Common ===
    private Boolean includeWarmUp = true;
    private List<WarmUpQuestion> warmUpQuestions;
    private Integer mandatoryQuestionCount = 5;
    private Integer optionalFrameCount = 2;
    private Integer optionalQuestionCount = 4;
    private Integer part3QuestionCount = 5;
}
