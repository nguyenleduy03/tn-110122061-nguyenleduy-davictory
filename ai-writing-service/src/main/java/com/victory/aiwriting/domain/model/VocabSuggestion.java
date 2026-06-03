package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VocabSuggestion {
    private String word;
    private String wordType;
    private String definition;
    private String context;
    private String originalWord;
}
