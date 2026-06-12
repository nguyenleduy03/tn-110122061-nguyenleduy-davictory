package com.victory.DAVictory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingGenerationRequest {
    private String candidateProfile; // "STUDENT" or "WORK"
    private SpeakingNewFormatData config; // The JSON parsed config from the test
}
