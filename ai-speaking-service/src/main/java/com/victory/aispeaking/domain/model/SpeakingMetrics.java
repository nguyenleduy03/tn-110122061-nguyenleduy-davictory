package com.victory.aispeaking.domain.model;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SpeakingMetrics {
    int totalWords;
    int uniqueWords;
    double lexicalDiversity;
    int hesitations;
    int discourseMarkers;
    int advancedWords;
    int errorCount;
    double speechRate;
    int sentenceCount;
    double avgSentenceLength;
    int complexSentences;
    int simpleSentences;
}
