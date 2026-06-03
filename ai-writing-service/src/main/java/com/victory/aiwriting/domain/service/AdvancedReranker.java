package com.victory.aiwriting.domain.service;

import com.victory.aiwriting.domain.model.EssayFeatures;
import com.victory.aiwriting.domain.port.VectorStorePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AdvancedReranker {

    private static final Pattern SENTENCE_SPLIT = Pattern.compile("[.!?]+\\s*");
    private static final Pattern WORD_SPLIT = Pattern.compile("[^a-zA-Z'-]+");

    private static final Set<String> STOP_WORDS = Set.of(
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "by", "with", "from", "as", "is", "was", "are", "were", "be",
        "been", "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "can", "could", "should", "may", "might", "shall", "this",
        "that", "these", "those", "it", "its", "they", "them", "their",
        "we", "us", "our", "you", "your", "he", "she", "him", "her", "his",
        "not", "no", "nor", "so", "if", "than", "then", "just", "also",
        "very", "too", "more", "most", "some", "any", "each", "every",
        "both", "all", "which", "what", "who", "whom", "when", "where",
        "why", "how", "about", "because", "while", "since", "until",
        "during", "before", "after", "above", "below", "between", "through",
        "into", "onto", "upon", "within", "without", "over", "under"
    );

    public record RerankedResult(
        VectorStorePort.SearchResult result,
        double compositeScore,
        double structureSimilarity,
        double topicCoherence,
        double semanticScore,
        double keywordScore
    ) {}

    public record RerankerOutput(
        List<RerankedResult> allScored,
        double avgStructureSimilarity,
        double avgTopicCoherence
    ) {}

    public RerankerOutput rerank(
            String queryText,
            List<VectorStorePort.SearchResult> candidates,
            EssayFeatures queryFeatures) {

        if (candidates.isEmpty()) {
            return new RerankerOutput(List.of(), 0.0, 0.0);
        }

        Set<String> queryKeywords = extractKeywords(queryText);
        List<String> querySentences = extractSentences(queryText);
        EssayFeatures queryFeat = queryFeatures != null ? queryFeatures : new EssayFeatureAnalyzer().analyze(queryText);

        double totalStructureSim = 0;
        double totalTopicSim = 0;

        var scored = new ArrayList<RerankedResult>();

        for (var candidate : candidates) {
            String essayText = (String) candidate.metadata().getOrDefault("essayText", "");
            String promptText = (String) candidate.metadata().getOrDefault("promptText", "");
            String docText = essayText + " " + promptText;

            double semanticScore = candidate.similarity();

            Set<String> docKeywords = extractKeywords(docText);
            double keywordScore = jaccardSimilarity(queryKeywords, docKeywords);

            double structureSimilarity = computeStructureSimilarity(
                querySentences, extractSentences(docText), queryFeat
            );

            double topicCoherence = computeTopicCoherence(
                queryKeywords, docKeywords, docText, queryText
            );

            double compositeScore = semanticScore * 0.30
                                  + keywordScore * 0.20
                                  + structureSimilarity * 0.25
                                  + topicCoherence * 0.25;

            totalStructureSim += structureSimilarity;
            totalTopicSim += topicCoherence;

            scored.add(new RerankedResult(
                candidate, compositeScore, structureSimilarity,
                topicCoherence, semanticScore, keywordScore
            ));
        }

        scored.sort(Comparator.comparingDouble(RerankedResult::compositeScore).reversed());

        double avgStructure = candidates.isEmpty() ? 0 : totalStructureSim / candidates.size();
        double avgTopic = candidates.isEmpty() ? 0 : totalTopicSim / candidates.size();

        return new RerankerOutput(scored, avgStructure, avgTopic);
    }

    public double computeStructureSimilarity(
            List<String> querySentences,
            List<String> docSentences,
            EssayFeatures queryFeatures) {

        if (querySentences.isEmpty() || docSentences.isEmpty()) return 0;

        int[] queryLengths = querySentences.stream()
            .mapToInt(s -> countWords(s))
            .toArray();
        int[] docLengths = docSentences.stream()
            .mapToInt(s -> countWords(s))
            .toArray();

        if (queryLengths.length == 0 || docLengths.length == 0) return 0;

        double avgQueryLen = Arrays.stream(queryLengths).average().orElse(10);
        double avgDocLen = Arrays.stream(docLengths).average().orElse(10);
        double lengthSim = 1.0 - Math.min(Math.abs(avgQueryLen - avgDocLen) / Math.max(avgQueryLen, avgDocLen), 1.0);

        int queryParagraphs = estimateParagraphs(querySentences);
        int docParagraphs = estimateParagraphs(docSentences);
        double paraSim = queryParagraphs == docParagraphs ? 1.0
            : 1.0 - Math.abs(queryParagraphs - docParagraphs) / 5.0;
        paraSim = Math.max(0, Math.min(1, paraSim));

        double sentenceCountSim = 1.0 - Math.min(
            Math.abs(queryLengths.length - docLengths.length) / 15.0, 1.0);

        int queryLong = (int) Arrays.stream(queryLengths).filter(l -> l > 25).count();
        int docLong = (int) Arrays.stream(docLengths).filter(l -> l > 25).count();
        double longSim = (queryLong == 0 && docLong == 0) ? 1.0
            : 1.0 - Math.min(Math.abs(queryLong - docLong) / 5.0, 1.0);

        return lengthSim * 0.30 + paraSim * 0.30 + sentenceCountSim * 0.20 + longSim * 0.20;
    }

    public double computeTopicCoherence(
            Set<String> queryKeywords,
            Set<String> docKeywords,
            String docText,
            String queryText) {

        double kwOverlap = jaccardSimilarity(queryKeywords, docKeywords);

        double bigramOverlap = computeBigramOverlap(queryText, docText);

        double weightedOverlap = computeWeightedKeywordOverlap(queryKeywords, docKeywords, queryText);

        return kwOverlap * 0.40 + bigramOverlap * 0.30 + weightedOverlap * 0.30;
    }

    private double computeBigramOverlap(String text1, String text2) {
        Set<String> bigrams1 = extractBigrams(text1);
        Set<String> bigrams2 = extractBigrams(text2);
        if (bigrams1.isEmpty() || bigrams2.isEmpty()) return 0;
        return jaccardSimilarity(bigrams1, bigrams2);
    }

    private double computeWeightedKeywordOverlap(
            Set<String> queryKeywords, Set<String> docKeywords, String queryText) {

        if (queryKeywords.isEmpty() || docKeywords.isEmpty()) return 0;

        String lowerQuery = queryText.toLowerCase();

        var intersection = new HashSet<>(queryKeywords);
        intersection.retainAll(docKeywords);

        if (intersection.isEmpty()) return 0;

        double totalWeight = 0;
        for (String kw : intersection) {
            int freqInQuery = countOccurrences(lowerQuery, kw);
            totalWeight += Math.log(1 + freqInQuery);
        }

        double maxPossible = queryKeywords.stream()
            .mapToDouble(kw -> Math.log(1 + countOccurrences(lowerQuery, kw)))
            .sum();

        return maxPossible > 0 ? totalWeight / maxPossible : 0;
    }

    public List<VectorStorePort.SearchResult> diversifyByBand(
            List<RerankedResult> scoredResults, int targetCount) {

        var lowBand  = filterByBandRange(scoredResults, 4.0, 6.0);
        var midBand  = filterByBandRange(scoredResults, 6.0, 7.5);
        var highBand = filterByBandRange(scoredResults, 7.5, 9.0);

        if (lowBand.isEmpty())  lowBand  = midBand.isEmpty() ? highBand : midBand;
        if (midBand.isEmpty())  midBand  = highBand.isEmpty() ? lowBand : highBand;
        if (highBand.isEmpty()) highBand = midBand.isEmpty() ? lowBand : midBand;

        var selected = new ArrayList<VectorStorePort.SearchResult>();
        addUnique(selected, lowBand);
        addUnique(selected, midBand);
        addUnique(selected, highBand);

        if (selected.isEmpty() && !scoredResults.isEmpty()) {
            for (int i = 0; i < Math.min(targetCount, scoredResults.size()); i++) {
                selected.add(scoredResults.get(i).result());
            }
        }

        return selected;
    }

    public double calculateBandSpread(List<VectorStorePort.SearchResult> samples) {
        if (samples.size() < 2) return 0.0;
        var bands = samples.stream()
            .mapToDouble(s -> (Double) s.metadata().getOrDefault("bandScore", 0.0))
            .sorted()
            .toArray();
        return bands[bands.length - 1] - bands[0];
    }

    private List<RerankedResult> filterByBandRange(List<RerankedResult> results, double min, double max) {
        return results.stream()
            .filter(r -> {
                var band = (Double) r.result().metadata().getOrDefault("bandScore", 0.0);
                return band >= min && band <= max;
            })
            .sorted(Comparator.comparingDouble(RerankedResult::compositeScore).reversed())
            .limit(2)
            .toList();
    }

    private void addUnique(List<VectorStorePort.SearchResult> target, List<RerankedResult> source) {
        for (var r : source) {
            if (target.stream().noneMatch(t ->
                t.metadata().get("id").equals(r.result().metadata().get("id")))) {
                target.add(r.result());
                return;
            }
        }
    }

    public static Set<String> extractKeywords(String text) {
        if (text == null || text.isBlank()) return Set.of();
        return WORD_SPLIT.splitAsStream(text.toLowerCase())
            .filter(w -> w.length() > 3)
            .filter(w -> !STOP_WORDS.contains(w))
            .collect(Collectors.toSet());
    }

    public static List<String> extractSentences(String text) {
        if (text == null || text.isBlank()) return List.of();
        return SENTENCE_SPLIT.splitAsStream(text)
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    }

    private double jaccardSimilarity(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) return 0;
        var intersection = new HashSet<>(a);
        intersection.retainAll(b);
        var union = new HashSet<>(a);
        union.addAll(b);
        return (double) intersection.size() / union.size();
    }

    private int countWords(String text) {
        return (int) WORD_SPLIT.splitAsStream(text)
            .filter(w -> !w.isEmpty())
            .count();
    }

    private int countOccurrences(String text, String word) {
        int count = 0;
        int idx = 0;
        while ((idx = text.indexOf(word, idx)) != -1) {
            count++;
            idx += word.length();
        }
        return count;
    }

    private int estimateParagraphs(List<String> sentences) {
        if (sentences.size() <= 3) return 1;
        if (sentences.size() <= 6) return 2;
        return Math.min(5, sentences.size() / 3);
    }

    private Set<String> extractBigrams(String text) {
        if (text == null || text.isBlank()) return Set.of();
        var words = WORD_SPLIT.splitAsStream(text.toLowerCase())
            .filter(w -> !w.isEmpty() && !STOP_WORDS.contains(w))
            .toList();
        var bigrams = new HashSet<String>();
        for (int i = 0; i < words.size() - 1; i++) {
            bigrams.add(words.get(i) + "_" + words.get(i + 1));
        }
        return bigrams;
    }
}
