package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeatureAnalysis {
    int wordCount;
    int sentenceCount;
    int uniqueWordCount;
    double lexicalDiversity;
    double avgSentenceLength;
    int hesitationCount;
    List<String> hesitationMarkers;
    int discourseMarkerCount;
    List<String> discourseMarkers;
    double speechRateWordsPerMin;
    String dominantTense;
    List<String> advancedVocabulary;
    int advancedWordCount;
    int errorCount;
    List<String> commonErrors;
    int repetitionCount;
    double complexSentenceRatio;
}
