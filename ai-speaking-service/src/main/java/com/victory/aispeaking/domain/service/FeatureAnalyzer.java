package com.victory.aispeaking.domain.service;

import com.victory.aispeaking.domain.model.FeatureAnalysis;
import com.victory.aispeaking.domain.model.SpeakingTurn;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class FeatureAnalyzer {

    private static final Set<String> HESITATION_MARKERS = Set.of(
        "um", "uh", "er", "ah", "like", "you know", "well", "i mean",
        "sort of", "kind of", "actually", "basically", "literally", "hmm"
    );

    private static final Set<String> DISCOURSE_MARKERS = Set.of(
        "first", "firstly", "second", "secondly", "third", "thirdly",
        "finally", "then", "next", "after that", "meanwhile", "later",
        "however", "nevertheless", "nonetheless", "on the other hand",
        "in contrast", "on the contrary", "conversely",
        "therefore", "thus", "consequently", "as a result", "hence",
        "for example", "for instance", "such as", "in particular", "notably",
        "in addition", "furthermore", "moreover", "also", "besides",
        "in my opinion", "i believe", "from my perspective", "personally",
        "to be honest", "frankly", "admittedly", "undoubtedly",
        "in conclusion", "to sum up", "overall", "in summary",
        "because", "since", "as", "due to", "owing to",
        "although", "though", "even though", "despite", "in spite of"
    );

    private static final Set<String> ACADEMIC_VOCABULARY = Set.of(
        "significant", "substantial", "considerable", "remarkable",
        "consequently", "furthermore", "nevertheless", "notwithstanding",
        "demonstrate", "illustrate", "indicate", "suggest", "reveal",
        "particularly", "specifically", "notably", "primarily",
        "beneficial", "advantageous", "detrimental", "adverse",
        "implement", "establish", "facilitate", "promote", "enhance",
        "phenomenon", "perspective", "implication", "correlation",
        "inevitable", "inevitably", "fundamental", "significantly",
        "comprehensive", "extensive", "prevalent", "predominant",
        "contribute", "influence", "impact", "affect",
        "subsequently", "ultimately", "eventually"
    );

    private static final Pattern REPETITION_PATTERN =
            Pattern.compile("\\b(\\w{3,})\\b\\s+\\b\\1\\b", Pattern.CASE_INSENSITIVE);

    private static final List<String> COMPLEX_CONJUNCTIONS = List.of(
        "although", "though", "whereas", "while", "despite", "in spite of",
        "because", "since", "as", "due to", "owing to",
        "unless", "provided that", "as long as", "even if",
        "so that", "in order that", "such that",
        "who", "whom", "which", "that", "whose", "where", "when"
    );

    public FeatureAnalysis analyze(List<SpeakingTurn> turns) {
        String fullText = turns.stream()
                .map(SpeakingTurn::getAnswerText)
                .filter(Objects::nonNull)
                .collect(Collectors.joining(" "));

        if (fullText.isBlank()) {
            return FeatureAnalysis.builder()
                    .wordCount(0).sentenceCount(0).uniqueWordCount(0)
                    .lexicalDiversity(0).avgSentenceLength(0)
                    .hesitationCount(0).hesitationMarkers(List.of())
                    .discourseMarkerCount(0).discourseMarkers(List.of())
                    .speechRateWordsPerMin(0)
                    .dominantTense("unknown")
                    .advancedVocabulary(List.of())
                    .advancedWordCount(0)
                    .errorCount(0).commonErrors(List.of())
                    .repetitionCount(0)
                    .complexSentenceRatio(0)
                    .build();
        }

        String[] sentences = fullText.split("[.!?]+\\s*");
        int sentenceCount = sentences.length;
        String[] words = fullText.toLowerCase().split("\\s+");
        int wordCount = words.length;

        Set<String> uniqueWords = new HashSet<>();
        List<String> wordList = new ArrayList<>();
        for (String w : words) {
            String clean = w.replaceAll("[^a-z]", "");
            if (clean.length() >= 2) {
                uniqueWords.add(clean);
                wordList.add(clean);
            }
        }

        double lexicalDiversity = uniqueWords.isEmpty() ? 0
                : (double) Math.min(uniqueWords.size(), wordList.size()) / Math.max(wordList.size(), 1);

        double avgSentenceLength = Math.max(sentenceCount, 1) > 0
                ? (double) wordCount / Math.max(sentenceCount, 1) : 0;

        List<String> hesitationMarkers = findHesitationMarkers(fullText);
        List<String> discourseMarkers = findDiscourseMarkers(fullText);
        List<String> advancedVocab = findAdvancedVocabulary(wordList);

        long totalAudioMs = turns.stream()
                .mapToLong(SpeakingTurn::getAnswerDurationMs)
                .sum();
        double speechRate = totalAudioMs > 0
                ? (double) wordCount / (Math.max(totalAudioMs, 1) / 60000.0)
                : 0;

        String dominantTense = detectDominantTense(fullText);

        int repetitionCount = countRepetitions(fullText);
        double complexSentenceRatio = calculateComplexSentenceRatio(sentences);

        return FeatureAnalysis.builder()
                .wordCount(wordCount)
                .sentenceCount(sentenceCount)
                .uniqueWordCount(uniqueWords.size())
                .lexicalDiversity(Math.round(lexicalDiversity * 100.0) / 100.0)
                .avgSentenceLength(Math.round(avgSentenceLength * 10.0) / 10.0)
                .hesitationCount(hesitationMarkers.size())
                .hesitationMarkers(hesitationMarkers)
                .discourseMarkerCount(discourseMarkers.size())
                .discourseMarkers(discourseMarkers)
                .speechRateWordsPerMin(Math.round(speechRate * 10.0) / 10.0)
                .dominantTense(dominantTense)
                .advancedVocabulary(advancedVocab)
                .advancedWordCount(advancedVocab.size())
                .errorCount(0).commonErrors(List.of())
                .repetitionCount(repetitionCount)
                .complexSentenceRatio(Math.round(complexSentenceRatio * 100.0) / 100.0)
                .build();
    }

    public String buildFeatureReport(FeatureAnalysis features) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("- Word count: %d | Sentences: %d | Unique words: %d%n",
                features.getWordCount(), features.getSentenceCount(), features.getUniqueWordCount()));
        sb.append(String.format("- Lexical diversity (TTR): %.2f%n", features.getLexicalDiversity()));
        sb.append(String.format("- Avg sentence length: %.1f words%n", features.getAvgSentenceLength()));
        sb.append(String.format("- Speech rate: %.1f words/min%n", features.getSpeechRateWordsPerMin()));
        sb.append(String.format("- Hesitation markers: %d (%s)%n",
                features.getHesitationCount(), features.getHesitationMarkers()));
        sb.append(String.format("- Discourse markers: %d (%s)%n",
                features.getDiscourseMarkerCount(), features.getDiscourseMarkers()));
        sb.append(String.format("- Advanced vocabulary: %d items%n", features.getAdvancedWordCount()));
        sb.append(String.format("- Dominant tense: %s%n", features.getDominantTense()));
        sb.append(String.format("- Repetition count: %d%n", features.getRepetitionCount()));
        sb.append(String.format("- Complex sentence ratio: %.2f%n", features.getComplexSentenceRatio()));
        return sb.toString();
    }

    private List<String> findHesitationMarkers(String text) {
        String lower = text.toLowerCase();
        return HESITATION_MARKERS.stream()
                .filter(m -> lower.contains(" " + m + " ") || lower.startsWith(m + " ")
                        || lower.contains("(" + m + ")") || lower.contains("," + m + ","))
                .collect(Collectors.toList());
    }

    private List<String> findDiscourseMarkers(String text) {
        String lower = text.toLowerCase();
        return DISCOURSE_MARKERS.stream()
                .filter(m -> lower.contains(" " + m + " ") || lower.startsWith(m + " "))
                .collect(Collectors.toList());
    }

    private List<String> findAdvancedVocabulary(List<String> words) {
        return words.stream()
                .filter(ACADEMIC_VOCABULARY::contains)
                .distinct()
                .collect(Collectors.toList());
    }

    private String detectDominantTense(String text) {
        long pastCount = countMatches(text, "\\b(went|was|were|had|did|said|made|took|came|gave|used to|grew|became)\\b");
        long presentCount = countMatches(text, "\\b(is|are|am|do|does|have|has|go|make|take|say|get|usually|often|always|every|sometimes|generally)\\b");
        long futureCount = countMatches(text, "\\b(will|going to|would|plan to|hope to|intend to|aim to|expect to)\\b");

        if (pastCount > presentCount && pastCount > futureCount) return "past";
        if (futureCount > pastCount && futureCount > presentCount) return "future";
        return "present";
    }

    private int countRepetitions(String text) {
        Matcher m = REPETITION_PATTERN.matcher(text.toLowerCase());
        int count = 0;
        while (m.find()) count++;
        return count;
    }

    private double calculateComplexSentenceRatio(String[] sentences) {
        if (sentences.length == 0) return 0;
        long complex = 0;
        for (String s : sentences) {
            String lower = s.toLowerCase();
            boolean hasComplex = COMPLEX_CONJUNCTIONS.stream().anyMatch(c -> lower.contains(" " + c + " "));
            if (hasComplex || s.split("\\s+").length > 15) {
                complex++;
            }
        }
        return (double) complex / sentences.length;
    }

    private long countMatches(String text, String regex) {
        Pattern p = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        long count = 0;
        while (m.find()) count++;
        return count;
    }
}
