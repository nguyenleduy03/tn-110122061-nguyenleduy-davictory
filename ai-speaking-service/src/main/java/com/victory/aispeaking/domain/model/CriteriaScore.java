package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class CriteriaScore {
    String code;
    String displayName;
    int band;
    List<String> strengths;
    List<String> weaknesses;
    String detailedFeedback;

    public static CriteriaScore empty(String code, String displayName) {
        return CriteriaScore.builder()
                .code(code)
                .displayName(displayName)
                .band(0)
                .strengths(List.of())
                .weaknesses(List.of())
                .detailedFeedback("")
                .build();
    }
}
