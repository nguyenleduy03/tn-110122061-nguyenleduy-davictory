package com.victory.aiwriting.domain.service;

import com.victory.aiwriting.domain.model.SampleEssay;
import com.victory.aiwriting.domain.port.VectorStorePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SampleRetriever {

    private final VectorStorePort vectorStore;

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

    public DiversifiedResult retrieveDiversified(String essayText, String taskType, String topic, int topK) {
        var metadataFilter = new HashMap<String, String>();
        if (taskType != null) {
            if (taskType.startsWith("TASK2_")) {
                // TASK2_ACADEMIC and TASK2_GENERAL are identical in IELTS
                metadataFilter.put("taskType", "TASK2_ACADEMIC");
            } else {
                metadataFilter.put("taskType", taskType);
            }
        }

        var candidates = vectorStore.search(essayText, topK * 5, metadataFilter);

        if (candidates.isEmpty()) {
            return new DiversifiedResult(List.of(), 0.0);
        }

        var hybridScored = applyHybridSearch(essayText, candidates);
        var diversified = diversifyByBand(hybridScored, topK);

        double avgSemantic = candidates.stream()
            .mapToDouble(VectorStorePort.SearchResult::similarity)
            .average().orElse(0.0);

        double bandSpread = calculateBandSpread(diversified);

        return new DiversifiedResult(diversified, avgSemantic, bandSpread);
    }

    private List<VectorStorePort.SearchResult> applyHybridSearch(
            String queryText, List<VectorStorePort.SearchResult> candidates) {

        Set<String> queryKeywords = extractKeywords(queryText);

        return candidates.stream()
            .map(r -> {
                double semanticScore = r.similarity();
                String essayText = (String) r.metadata().getOrDefault("essayText", "");
                String promptText = (String) r.metadata().getOrDefault("promptText", "");
                Set<String> docKeywords = extractKeywords(essayText + " " + promptText);
                double keywordScore = jaccardSimilarity(queryKeywords, docKeywords);
                double hybridScore = semanticScore * 0.7 + keywordScore * 0.3;
                return new ScoredResult(r, hybridScore, semanticScore, keywordScore);
            })
            .sorted(Comparator.comparingDouble(ScoredResult::hybridScore).reversed())
            .map(ScoredResult::result)
            .toList();
    }

    private Set<String> extractKeywords(String text) {
        if (text == null || text.isBlank()) return Set.of();
        return Arrays.stream(text.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", " ")
                .split("\\s+"))
            .filter(w -> w.length() > 3)
            .filter(w -> !STOP_WORDS.contains(w))
            .collect(Collectors.toSet());
    }

    private double jaccardSimilarity(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) return 0;
        var intersection = new HashSet<>(a);
        intersection.retainAll(b);
        var union = new HashSet<>(a);
        union.addAll(b);
        return (double) intersection.size() / union.size();
    }

    private List<SampleEssay> diversifyByBand(List<VectorStorePort.SearchResult> results, int topK) {
        var lowBand  = filterByBandRange(results, 4.0, 6.0);
        var midBand  = filterByBandRange(results, 6.0, 7.5);
        var highBand = filterByBandRange(results, 7.5, 9.0);

        if (lowBand.isEmpty())  lowBand  = midBand;
        if (midBand.isEmpty())  midBand  = highBand;
        if (highBand.isEmpty()) highBand = midBand;

        var samples = new ArrayList<SampleEssay>();
        if (!lowBand.isEmpty()) samples.add(toSampleEssay(lowBand.get(0)));
        if (!midBand.isEmpty() && midBand != lowBand) samples.add(toSampleEssay(midBand.get(0)));
        if (!highBand.isEmpty() && highBand != midBand) samples.add(toSampleEssay(highBand.get(0)));

        if (samples.isEmpty() && !results.isEmpty()) {
            for (int i = 0; i < Math.min(topK, results.size()); i++) {
                samples.add(toSampleEssay(results.get(i)));
            }
        }

        return samples;
    }

    private List<VectorStorePort.SearchResult> filterByBandRange(
            List<VectorStorePort.SearchResult> results, double min, double max) {
        return results.stream()
            .filter(r -> {
                var band = (Double) r.metadata().getOrDefault("bandScore", 0.0);
                return band >= min && band <= max;
            })
            .limit(1)
            .toList();
    }

    private double calculateBandSpread(List<SampleEssay> samples) {
        if (samples.size() < 2) return 0.0;
        var bands = samples.stream().mapToDouble(SampleEssay::getBandScore).sorted().toArray();
        return bands[bands.length - 1] - bands[0];
    }

    private SampleEssay toSampleEssay(VectorStorePort.SearchResult result) {
        var meta = result.metadata();
        return SampleEssay.builder()
            .id((Long) meta.getOrDefault("id", 0L))
            .taskType((String) meta.getOrDefault("taskType", ""))
            .topic((String) meta.getOrDefault("topic", ""))
            .promptText((String) meta.getOrDefault("promptText", ""))
            .bandScore((Double) meta.getOrDefault("bandScore", 0.0))
            .essayText((String) meta.getOrDefault("essayText", ""))
            .examinerComment((String) meta.getOrDefault("examinerComment", ""))
            .hasComment((Boolean) meta.getOrDefault("hasComment", false))
            .wordCount((Integer) meta.getOrDefault("wordCount", 0))
            .build();
    }

    public record DiversifiedResult(
        List<SampleEssay> samples,
        double avgSimilarity,
        double bandSpread
    ) {
        public DiversifiedResult(List<SampleEssay> samples, double avgSimilarity) {
            this(samples, avgSimilarity, 0.0);
        }
    }

    private record ScoredResult(
        VectorStorePort.SearchResult result,
        double hybridScore,
        double semanticScore,
        double keywordScore
    ) {}
}
