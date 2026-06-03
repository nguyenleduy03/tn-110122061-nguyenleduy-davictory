package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class CriteriaScore {
    private String code;
    private String displayName;
    private Double band;
    private String bandJustification;
    private List<String> strengths;
    private List<String> weaknesses;
    private List<String> evidenceFromEssay;
    private String detailedFeedback;
    private List<VocabularySuggestion> vocabularySuggestions;
    private List<ErrorExample> errorExamples;

    @Data
    @Builder
    public static class VocabularySuggestion {
        private String original;
        private List<String> alternatives;
    }

    @Data
    @Builder
    public static class ErrorExample {
        private String original;
        private String correction;
        private String explanation;
        private String location;
    }
}
