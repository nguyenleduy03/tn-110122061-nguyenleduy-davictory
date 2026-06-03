package com.victory.aiwriting.domain.service;

import com.victory.aiwriting.domain.model.EssayFeatures;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class EssayFeatureAnalyzer {

    private static final Pattern SENTENCE_SPLIT = Pattern.compile("[.!?]+\\s*");
    private static final Pattern WORD_SPLIT = Pattern.compile("[^a-zA-Z'-]+");
    private static final Pattern PARAGRAPH_SPLIT = Pattern.compile("\\n\\s*\\n");

    private static final Set<String> COHESION_MARKERS = Set.of(
        "however", "moreover", "furthermore", "nevertheless", "nonetheless",
        "therefore", "thus", "hence", "consequently", "accordingly",
        "in addition", "additionally", "besides", "likewise", "similarly",
        "on the other hand", "in contrast", "conversely", "on the contrary",
        "firstly", "secondly", "thirdly", "finally", "lastly",
        "in conclusion", "to conclude", "to summarise", "in summary",
        "for example", "for instance", "such as", "including",
        "as a result", "because of", "due to", "owing to",
        "in particular", "notably", "specifically", "particularly",
        "in other words", "that is", "i.e.", "namely",
        "meanwhile", "subsequently", "previously", "simultaneously",
        "overall", "in general", "generally", "typically",
        "admittedly", "undoubtedly", "certainly", "indeed",
        "although", "while", "whereas", "despite", "in spite of"
    );

    private static final Set<String> ACADEMIC_WORDS = Set.of(
        "analyze", "approach", "area", "assess", "assume", "authority",
        "available", "benefit", "concept", "consistent", "constitute",
        "context", "contract", "create", "data", "define", "derive",
        "distribute", "economy", "environment", "establish", "estimate",
        "evidence", "export", "factor", "finance", "formula", "function",
        "identified", "income", "indicate", "individual", "interpret",
        "involve", "issue", "labor", "legal", "legislate", "major",
        "method", "occur", "percent", "period", "policy", "principle",
        "procedure", "process", "require", "research", "respond",
        "role", "section", "sector", "significant", "similar",
        "source", "specific", "structure", "theory", "transfer",
        "vary", "welfare", "academic", "alternative", "analysis",
        "complex", "component", "comprehensive", "conventional",
        "corporate", "correlation", "criterion", "deduction", "demonstrate",
        "dimension", "domestic", "emphasise", "empirical", "entity",
        "equivalent", "evaluation", "explicit", "federal", "framework",
        "ideology", "implicit", "institution", "integration", "internal",
        "investigation", "migration", "minimum", "norm", "objective",
        "orientation", "paradigm", "parameter", "perception", "phenomenon",
        "philosophy", "priority", "proportion", "protocol", "qualitative",
        "quantitative", "recognition", "regulation", "relevance", "residue",
        "restriction", "simulation", "strategy", "subsidy", "substitution",
        "sufficient", "supplement", "surplus", "sustainability", "symbol",
        "tape", "target", "task", "team", "technique", "technology",
        "temporary", "tension", "terminal", "territory", "theme",
        "thesis", "topic", "tradition", "transform",
        "transition", "trend", "trigger", "variable", "version", "virtual",
        "vision", "visual", "volume", "voluntary"
    );

    private static final Set<String> INTRODUCTION_MARKERS = Set.of(
        "this essay", "this paper", "in this essay", "the following",
        "there are several", "there is a", "nowadays", "in today's",
        "in the modern", "over the past", "in recent", "it is often",
        "it is widely", "many people", "some people", "a common",
        "one of the", "the issue of", "the topic of", "the question of"
    );

    private static final Set<String> CONCLUSION_MARKERS = Set.of(
        "in conclusion", "to conclude", "to summarise", "in summary",
        "overall", "in closing", "to sum up", "all things considered",
        "taking everything into account", "in a nutshell",
        "in the final analysis", "ultimately"
    );

    public EssayFeatures analyze(String essayText) {
        if (essayText == null || essayText.isBlank()) {
            return EssayFeatures.builder().build();
        }

        String cleanText = essayText.trim();
        int wordCount = countWords(cleanText);
        int sentenceCount = countSentences(cleanText);
        int paragraphCount = countParagraphs(cleanText);
        double avgWordLength = computeAvgWordLength(cleanText);
        double avgSentenceLength = sentenceCount > 0 ? (double) wordCount / sentenceCount : 0;
        double lexicalDiversity = computeLexicalDiversity(cleanText);
        List<String> cohesionMarkers = findCohesionMarkers(cleanText);
        double cohesionDensity = wordCount > 0 ? (double) cohesionMarkers.size() / wordCount * 100 : 0;
        double academicRatio = computeAcademicRatio(cleanText);
        double avgWordsPerParagraph = paragraphCount > 0 ? (double) wordCount / paragraphCount : 0;

        boolean hasIntro = detectIntroduction(cleanText);
        boolean hasConclusion = detectConclusion(cleanText);
        boolean hasClearStructure = hasIntro && hasConclusion && paragraphCount >= 3;

        int[] sentenceLengths = computeSentenceLengths(cleanText);
        int longSentenceCount = (int) Arrays.stream(sentenceLengths).filter(l -> l > 25).count();
        int shortSentenceCount = (int) Arrays.stream(sentenceLengths).filter(l -> l < 8).count();

        int complexWordRatio = computeComplexWordRatio(cleanText, wordCount);

        return EssayFeatures.builder()
            .wordCount(wordCount)
            .sentenceCount(sentenceCount)
            .paragraphCount(paragraphCount)
            .avgWordLength(avgWordLength)
            .avgSentenceLength(avgSentenceLength)
            .lexicalDiversity(lexicalDiversity)
            .academicVocabularyRatio(academicRatio)
            .cohesionMarkerDensity(cohesionDensity)
            .cohesionMarkersFound(cohesionMarkers)
            .avgWordsPerParagraph(avgWordsPerParagraph)
            .hasIntroduction(hasIntro)
            .hasConclusion(hasConclusion)
            .hasClearStructure(hasClearStructure)
            .longSentenceCount(longSentenceCount)
            .shortSentenceCount(shortSentenceCount)
            .complexWordRatio(complexWordRatio)
            .build();
    }

    public String buildFeatureReport(EssayFeatures f) {
        if (f.getWordCount() == 0) return "No essay text available for analysis.";

        var sb = new StringBuilder();
        sb.append("=== OBJECTIVE ESSAY FEATURE ANALYSIS ===\n\n");
        sb.append(String.format("Word Count: %d words\n", f.getWordCount()));
        sb.append(String.format("Sentence Count: %d sentences\n", f.getSentenceCount()));
        sb.append(String.format("Paragraph Count: %d paragraphs\n", f.getParagraphCount()));
        sb.append(String.format("Average Word Length: %.1f characters\n", f.getAvgWordLength()));
        sb.append(String.format("Average Sentence Length: %.1f words\n", f.getAvgSentenceLength()));
        sb.append(String.format("Lexical Diversity (TTR): %.2f (higher = more varied vocabulary)\n", f.getLexicalDiversity()));
        sb.append(String.format("Academic Vocabulary: %.1f%% of words are academic\n", f.getAcademicVocabularyRatio() * 100));
        sb.append(String.format("Cohesion Marker Density: %.1f per 100 words\n", f.getCohesionMarkerDensity()));
        sb.append(String.format("Long Sentences (>25 words): %d\n", f.getLongSentenceCount()));
        sb.append(String.format("Short Sentences (<8 words): %d\n", f.getShortSentenceCount()));

        sb.append("\nStructure Analysis:\n");
        sb.append(String.format("  - Has Introduction: %s\n", f.isHasIntroduction() ? "Yes" : "No"));
        sb.append(String.format("  - Has Conclusion: %s\n", f.isHasConclusion() ? "Yes" : "No"));
        sb.append(String.format("  - Clear Structure (intro+body+conclusion): %s\n", f.isHasClearStructure() ? "Yes" : "No"));

        if (!f.getCohesionMarkersFound().isEmpty()) {
            sb.append("\nCohesion Markers Detected:\n");
            var grouped = f.getCohesionMarkersFound().stream()
                .collect(Collectors.groupingBy(m -> m, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .toList();
            for (var entry : grouped) {
                sb.append(String.format("  - \"%s\" (%d×)\n", entry.getKey(), entry.getValue()));
            }
        }

        return sb.toString();
    }

    public String buildGradingHints(EssayFeatures f) {
        if (f.getWordCount() == 0) return "";
        var hints = new ArrayList<String>();

        if (f.getWordCount() < 200) {
            hints.add("Essay is short (" + f.getWordCount() + " words). Task achievement may be limited.");
        } else if (f.getWordCount() > 400) {
            hints.add("Essay is long (" + f.getWordCount() + " words). Check for relevance and conciseness.");
        }

        if (f.getLexicalDiversity() < 0.5) {
            hints.add("Low lexical diversity (" + String.format("%.2f", f.getLexicalDiversity()) + "). Possible vocabulary repetition.");
        } else if (f.getLexicalDiversity() > 0.7) {
            hints.add("High lexical diversity (" + String.format("%.2f", f.getLexicalDiversity()) + "). Good vocabulary range.");
        }

        if (f.getAcademicVocabularyRatio() < 0.05) {
            hints.add("Low academic vocabulary usage (" + String.format("%.1f", f.getAcademicVocabularyRatio() * 100) + "%). Consider more formal/academic language.");
        } else if (f.getAcademicVocabularyRatio() > 0.20) {
            hints.add("Strong academic vocabulary usage (" + String.format("%.1f", f.getAcademicVocabularyRatio() * 100) + "%).");
        }

        if (f.getCohesionMarkerDensity() < 1.0) {
            hints.add("Low cohesion marker usage. Essay may lack logical flow.");
        } else if (f.getCohesionMarkerDensity() > 4.0) {
            hints.add("Very frequent cohesion markers. Check for naturalness.");
        }

        if (!f.isHasClearStructure()) {
            hints.add("Unclear essay structure. Expected: Introduction → Body paragraphs → Conclusion.");
        }

        if (f.getAvgSentenceLength() > 22) {
            hints.add("Long average sentence length (" + String.format("%.1f", f.getAvgSentenceLength()) + "). Check for run-on sentences.");
        }

        if (hints.isEmpty()) return "";
        return "Hints: " + String.join(" | ", hints);
    }

    private int countWords(String text) {
        var m = WORD_SPLIT.splitAsStream(text)
            .filter(w -> !w.isEmpty())
            .toList();
        return m.size();
    }

    private int countSentences(String text) {
        var m = SENTENCE_SPLIT.splitAsStream(text)
            .filter(s -> !s.isBlank())
            .toList();
        return Math.max(m.size(), 1);
    }

    private int countParagraphs(String text) {
        var m = PARAGRAPH_SPLIT.splitAsStream(text)
            .filter(p -> !p.isBlank())
            .toList();
        return Math.max(m.size(), 1);
    }

    private double computeAvgWordLength(String text) {
        var words = WORD_SPLIT.splitAsStream(text)
            .filter(w -> !w.isEmpty())
            .toList();
        if (words.isEmpty()) return 0;
        return words.stream().mapToInt(String::length).average().orElse(0);
    }

    private double computeLexicalDiversity(String text) {
        var words = WORD_SPLIT.splitAsStream(text)
            .filter(w -> !w.isEmpty())
            .map(String::toLowerCase)
            .toList();
        if (words.isEmpty()) return 0;
        long unique = new HashSet<>(words).size();
        return (double) unique / words.size();
    }

    private List<String> findCohesionMarkers(String text) {
        String lower = text.toLowerCase();
        return COHESION_MARKERS.stream()
            .filter(marker -> lower.contains(marker))
            .collect(Collectors.toList());
    }

    private double computeAcademicRatio(String text) {
        var words = WORD_SPLIT.splitAsStream(text)
            .filter(w -> !w.isEmpty())
            .map(String::toLowerCase)
            .toList();
        if (words.isEmpty()) return 0;
        long academic = words.stream().filter(ACADEMIC_WORDS::contains).count();
        return (double) academic / words.size();
    }

    private boolean detectIntroduction(String text) {
        String lower = text.toLowerCase();
        String firstPart = text.length() > 500 ? text.substring(0, 500) : text;
        String lowerFirst = firstPart.toLowerCase();
        return INTRODUCTION_MARKERS.stream().anyMatch(lowerFirst::contains);
    }

    private boolean detectConclusion(String text) {
        String lower = text.toLowerCase();
        String lastPart = text.length() > 500 ? text.substring(text.length() - 500) : text;
        String lowerLast = lastPart.toLowerCase();
        return CONCLUSION_MARKERS.stream().anyMatch(lowerLast::contains);
    }

    private int[] computeSentenceLengths(String text) {
        var sentences = SENTENCE_SPLIT.splitAsStream(text)
            .filter(s -> !s.isBlank())
            .toList();
        return sentences.stream()
            .mapToInt(s -> countWords(s))
            .toArray();
    }

    private int computeComplexWordRatio(String text, int wordCount) {
        if (wordCount == 0) return 0;
        var words = WORD_SPLIT.splitAsStream(text)
            .filter(w -> !w.isEmpty())
            .toList();
        long complex = words.stream().filter(w -> w.length() >= 9).count();
        return (int) (complex * 100 / wordCount);
    }
}
