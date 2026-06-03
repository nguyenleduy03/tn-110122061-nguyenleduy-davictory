package com.victory.aispeaking.application.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;

@Data
public class StartSessionRequest {
    private String targetLanguage = "english";
    private String scenario = "ielts_speaking";
    private String focusArea = "part1";
    private String topic = "random_topics";
    private String currentLevel = "band_6";
    private String targetLevel = "band_7";
    private String practiceMode = "mock_test";
    private String aiRole = "examiner";
    private String responseStyle = "formal";
    private String voiceAccent = "female_uk";
    private String feedbackLanguage = "english";
}
