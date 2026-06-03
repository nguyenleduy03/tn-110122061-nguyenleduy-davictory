package com.victory.aiwriting.domain.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class EssayFeatures {
    private int wordCount;
    private int sentenceCount;
    private int paragraphCount;
    private double avgWordLength;
    private double avgSentenceLength;
    private double lexicalDiversity;
    private double academicVocabularyRatio;
    private double cohesionMarkerDensity;
    private List<String> cohesionMarkersFound;
    private double avgWordsPerParagraph;
    private boolean hasIntroduction;
    private boolean hasConclusion;
    private boolean hasClearStructure;
    private int longSentenceCount;
    private int shortSentenceCount;
    private int complexWordRatio;
}
