package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SessionConfig {
    String targetLanguage;
    String scenario;
    String focusArea;
    String topic;
    String currentLevel;
    String targetLevel;
    String practiceMode;
    String aiRole;
    String responseStyle;
    String voiceAccent;
    String feedbackLanguage;

    public static SessionConfig defaultIELTS() {
        return SessionConfig.builder()
                .targetLanguage("english")
                .scenario("ielts_speaking")
                .focusArea("part1")
                .topic("random_topics")
                .currentLevel("band_6")
                .targetLevel("band_7")
                .practiceMode("mock_test")
                .aiRole("examiner")
                .responseStyle("formal")
                .voiceAccent("female_uk")
                .feedbackLanguage("english")
                .build();
    }
}
