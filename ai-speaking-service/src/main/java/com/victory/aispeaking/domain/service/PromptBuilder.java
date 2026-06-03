package com.victory.aispeaking.domain.service;

import com.victory.aispeaking.domain.model.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PromptBuilder {

    private static final String SYSTEM_ROLE_PATH = "ai/prompt/templates/system_role.txt";
    private static final String SCORING_FLUENCY_PATH = "ai/prompt/templates/scoring_fluency.txt";
    private static final String SCORING_LEXICAL_PATH = "ai/prompt/templates/scoring_lexical.txt";
    private static final String SCORING_GRAMMAR_PATH = "ai/prompt/templates/scoring_grammar.txt";
    private static final String SCORING_PRONUNCIATION_PATH = "ai/prompt/templates/scoring_pronunciation.txt";
    private static final String OUTPUT_SCHEMA_PATH = "ai/prompt/templates/output_schema.json";

    private String systemRoleTemplate;
    private String fluencyPromptTemplate;
    private String lexicalPromptTemplate;
    private String grammarPromptTemplate;
    private String pronunciationPromptTemplate;
    private String outputSchema;

    public PromptBuilder() {
        try {
            this.systemRoleTemplate = loadResource(SYSTEM_ROLE_PATH);
            this.fluencyPromptTemplate = loadResource(SCORING_FLUENCY_PATH);
            this.lexicalPromptTemplate = loadResource(SCORING_LEXICAL_PATH);
            this.grammarPromptTemplate = loadResource(SCORING_GRAMMAR_PATH);
            this.pronunciationPromptTemplate = loadResource(SCORING_PRONUNCIATION_PATH);
            this.outputSchema = loadResource(OUTPUT_SCHEMA_PATH);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load prompt templates", e);
        }
    }

    public ConversationContext buildConversationContext(
            SessionConfig config, List<SpeakingTurn> history, String nextQuestion,
            String sessionSeed, String topicVariation, int remainingTurns) {

        String systemPrompt = systemRoleTemplate;

        String partInstructions = buildPartInstructions(config.getFocusArea(), config.getPracticeMode());

        String historyText = formatConversationHistory(history);

        return ConversationContext.builder()
                .systemPrompt(systemPrompt)
                .partInstructions(partInstructions)
                .conversationHistory(historyText)
                .nextQuestion(nextQuestion)
                .sessionSeed(sessionSeed)
                .topicVariation(topicVariation)
                .config(config)
                .remainingTurns(remainingTurns)
                .build();
    }

    public PromptContext buildFluencyPrompt(List<SpeakingTurn> turns, String part) {
        String qaBlock = formatQABlock(turns);
        String prompt = fluencyPromptTemplate
                .replace("{{part}}", part)
                .replace("{{qa_block}}", qaBlock);

        return PromptContext.builder()
                .systemPrompt("You are an expert IELTS Speaking evaluator.")
                .userSection(prompt)
                .outputSchema(outputSchema)
                .estimatedTokens(countTokens(prompt))
                .build();
    }

    public PromptContext buildLexicalPrompt(List<SpeakingTurn> turns, String part) {
        String qaBlock = formatQABlock(turns);
        String prompt = lexicalPromptTemplate
                .replace("{{part}}", part)
                .replace("{{qa_block}}", qaBlock);

        return PromptContext.builder()
                .systemPrompt("You are an expert IELTS Speaking evaluator.")
                .userSection(prompt)
                .outputSchema(outputSchema)
                .estimatedTokens(countTokens(prompt))
                .build();
    }

    public PromptContext buildGrammarPrompt(List<SpeakingTurn> turns, String part) {
        String qaBlock = formatQABlock(turns);
        String prompt = grammarPromptTemplate
                .replace("{{part}}", part)
                .replace("{{qa_block}}", qaBlock);

        return PromptContext.builder()
                .systemPrompt("You are an expert IELTS Speaking evaluator.")
                .userSection(prompt)
                .outputSchema(outputSchema)
                .estimatedTokens(countTokens(prompt))
                .build();
    }

    public PromptContext buildPronunciationPrompt(List<SpeakingTurn> turns, String part) {
        String qaBlock = formatQABlock(turns);
        String prompt = pronunciationPromptTemplate
                .replace("{{part}}", part)
                .replace("{{qa_block}}", qaBlock);

        return PromptContext.builder()
                .systemPrompt("You are an expert IELTS Speaking evaluator.")
                .userSection(prompt)
                .outputSchema(outputSchema)
                .estimatedTokens(countTokens(prompt))
                .build();
    }

    private String buildPartInstructions(String focusArea, String practiceMode) {
        StringBuilder sb = new StringBuilder();
        switch (focusArea) {
            case "part1" -> sb.append("""
                === Part 1: Introduction and Interview ===
                Duration: 4-5 minutes
                - Ask questions about familiar topics: home, work/study, hobbies, family, etc.
                - Each question should be simple and personal
                - Ask 8-12 questions across 3 topic sets
                - Answers should be 2-3 sentences
                """);
            case "part2" -> sb.append("""
                === Part 2: Individual Long Turn ===
                Duration: 3-4 minutes (1 min prep + 1-2 min speaking)
                - Give the candidate a cue card with a topic and prompts
                - Allow 1 minute preparation time
                - Let candidate speak for 1-2 minutes without interruption
                - Ask 1-2 brief follow-up questions after
                """);
            case "part3" -> sb.append("""
                === Part 3: Two-way Discussion ===
                Duration: 4-5 minutes
                - Discuss abstract ideas related to Part 2 topic
                - Ask questions requiring opinions, analysis, evaluation
                - Answers should be 3-5 sentences with examples
                - May challenge or extend candidate's ideas
                """);
        }

        if ("guided".equals(practiceMode)) {
            sb.append("\nMode: Guided Practice - provide hints and encouragement after each answer.\n");
        } else {
            sb.append("\nMode: Mock Test - behave exactly like a real IELTS examiner.\n");
        }

        return sb.toString();
    }

    private String formatConversationHistory(List<SpeakingTurn> history) {
        if (history == null || history.isEmpty()) return "";

        return history.stream()
                .map(t -> String.format("[Turn %d - %s]\nExaminer: %s\nCandidate: %s\n",
                        t.getTurnNumber(), t.getPart(), t.getQuestionText(),
                        t.getAnswerText() != null ? t.getAnswerText() : "(waiting for answer)"))
                .collect(Collectors.joining("\n"));
    }

    private String formatQABlock(List<SpeakingTurn> turns) {
        if (turns == null || turns.isEmpty()) return "No answers provided.";

        return turns.stream()
                .filter(t -> t.getAnswerText() != null && !t.getAnswerText().isBlank())
                .map(t -> String.format("[Q-%s] %s\n[A-%s] %s\n",
                        t.getQuestionId(), t.getQuestionText(),
                        t.getQuestionId(), t.getAnswerText()))
                .collect(Collectors.joining("\n"));
    }

    private String loadResource(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    private int countTokens(String text) {
        return text.length() / 4;
    }
}
