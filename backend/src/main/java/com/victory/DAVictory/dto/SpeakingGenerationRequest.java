package com.victory.DAVictory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingGenerationRequest {
    private String candidateProfile;
    private SpeakingNewFormatData config;
    private Long attemptId; // optional: để tạo snapshot nếu có
}
