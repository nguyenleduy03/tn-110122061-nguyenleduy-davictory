package com.victory.aispeaking.domain.service;

import com.victory.aispeaking.domain.model.*;
import com.victory.aispeaking.domain.port.AIProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationManager {

    private final PromptBuilder promptBuilder;
    private final AIProvider conversationProvider;

    private static final List<String> SESSION_SEEDS = List.of(
        "Start with an unexpected angle",
        "Begin with a personal observation",
        "Open with a thought-provoking question",
        "Start casual then gradually increase complexity",
        "Focus on contrasting perspectives",
        "Emphasize practical examples",
        "Begin with current trends",
        "Connect to daily life experiences",
        "Use hypothetical scenarios",
        "Start with a common misconception"
    );

    private static final List<String> TOPIC_VARIATIONS = List.of(
        "traditional vs modern aspects",
        "personal experience focus",
        "advantages and disadvantages",
        "future predictions and possibilities",
        "childhood memories related to",
        "cultural differences perspective",
        "common challenges and obstacles",
        "recent changes and developments"
    );

    private static final int MAX_RETRIES = 2;

    public String generateNextQuestion(SessionConfig config, List<SpeakingTurn> history) {
        ConversationContext ctx = promptBuilder.buildConversationContext(
                config, history, null,
                getRandomElement(SESSION_SEEDS),
                getRandomElement(TOPIC_VARIATIONS),
                getRemainingTurns(config, history));

        String fullPrompt = ctx.toFullPrompt() + buildQuestionInstruction(config);

        for (int i = 0; i <= MAX_RETRIES; i++) {
            try {
                String response = conversationProvider.chat(PromptContext.builder()
                        .systemPrompt(fullPrompt)
                        .userSection("Generate the next IELTS Speaking question as a single examiner prompt.")
                        .estimatedTokens(fullPrompt.length() / 4)
                        .build());

                String question = extractQuestion(response);
                if (isValidQuestion(question, config.getFocusArea())) {
                    return question;
                }
                log.warn("Invalid question generated, retry {}/{}", i + 1, MAX_RETRIES);
            } catch (Exception e) {
                log.error("Failed to generate question: {}", e.getMessage());
            }
        }

        return getFallbackQuestion(config.getFocusArea());
    }

    public String generateFollowUp(SessionConfig config, List<SpeakingTurn> history, String lastAnswer) {
        List<SpeakingTurn> recentHistory = history.size() > 3
                ? history.subList(history.size() - 3, history.size())
                : history;

        String context = recentHistory.stream()
                .map(t -> String.format("Examiner: %s\nCandidate: %s",
                        t.getQuestionText(), t.getAnswerText()))
                .collect(Collectors.joining("\n"));

        String prompt = String.format("""
            Based on this conversation:
            %s

            Candidate's last answer: "%s"

            Generate a natural follow-up question related to the candidate's last answer.
            The question should probe deeper into the topic.
            Role: %s | Style: %s | Target level: %s

            Question:
            """, context, lastAnswer,
                config.getAiRole(), config.getResponseStyle(), config.getTargetLevel());

        try {
            String response = conversationProvider.chat(PromptContext.builder()
                    .systemPrompt("You are an IELTS Speaking Examiner.")
                    .userSection(prompt)
                    .estimatedTokens(200)
                    .build());
            return extractQuestion(response);
        } catch (Exception e) {
            log.error("Failed to generate follow-up: {}", e.getMessage());
            return "Could you tell me more about that?";
        }
    }

    public String provideFeedback(SessionConfig config, SpeakingTurn turn) {
        String prompt = String.format("""
            Provide brief feedback (2-3 sentences) for this IELTS Speaking answer.
            Question: %s
            Answer: %s
            Focus on one strength and one area for improvement.
            Be encouraging and specific.
            """, turn.getQuestionText(), turn.getAnswerText());

        try {
            return conversationProvider.chat(PromptContext.builder()
                    .systemPrompt("You are an encouraging IELTS Speaking coach.")
                    .userSection(prompt)
                    .estimatedTokens(200)
                    .build());
        } catch (Exception e) {
            return "Good attempt! Keep practicing to improve.";
        }
    }

    public String endSessionMessage(SessionConfig config, List<SpeakingTurn> history, String part) {
        String prompt = String.format("""
            The candidate has completed %s of the IELTS Speaking test.
            Generate a brief closing message (2-3 sentences) in the style of an IELTS examiner.
            Thank them and mention they can review their transcript or get score analysis.
            """, part);

        try {
            return conversationProvider.chat(PromptContext.builder()
                    .systemPrompt("You are an IELTS Speaking Examiner.")
                    .userSection(prompt)
                    .estimatedTokens(150)
                    .build());
        } catch (Exception e) {
            return "That's the end of " + part + ". You may review your performance or download the transcript.";
        }
    }

    private String extractQuestion(String response) {
        if (response == null || response.isBlank()) return "";
        String cleaned = response.trim();
        if (cleaned.contains("Question:") && !cleaned.startsWith("Question:")) {
            int idx = cleaned.lastIndexOf("Question:");
            cleaned = cleaned.substring(idx + 9).trim();
        }
        cleaned = cleaned.replaceAll("^[\"']+|[\"']+$", "").trim();
        if (cleaned.length() > 500) cleaned = cleaned.substring(0, 500);
        return cleaned;
    }

    private boolean isValidQuestion(String question, String focusArea) {
        if (question == null || question.isBlank()) return false;
        if (question.length() < 10) return false;
        if (question.contains("```") || question.contains("{")) return false;
        if ("part2".equals(focusArea)) {
            return question.contains("Describe") || question.contains("Talk about")
                    || question.contains("cue card") || question.contains("topic");
        }
        return true;
    }

    private String getFallbackQuestion(String focusArea) {
        return switch (focusArea) {
            case "part1" -> "Let's talk about where you live. Do you live in a house or an apartment?";
            case "part2" -> "Describe a book you have recently read. You should say: what the book is, when you read it, what it is about, and explain why you enjoyed it.";
            case "part3" -> "Let's discuss reading habits more generally. Do you think people read less nowadays compared to the past?";
            default -> "Tell me about yourself.";
        };
    }

    private int getRemainingTurns(SessionConfig config, List<SpeakingTurn> history) {
        int max = switch (config.getFocusArea()) {
            case "part1" -> 12; case "part2" -> 5; case "part3" -> 10;
            default -> 20;
        };
        return Math.max(0, max - history.size());
    }

    private String getRandomElement(List<String> list) {
        return list.get(new Random().nextInt(list.size()));
    }

    private String buildQuestionInstruction(SessionConfig config) {
        StringBuilder sb = new StringBuilder("\n## Question Generation Rules\n");
        switch (config.getFocusArea()) {
            case "part1" -> sb.append("Ask simple personal questions about familiar topics (work/study, home, hobbies, family, travel). Questions require 2-3 sentence answers. Do not ask for abstract opinions.\n");
            case "part2" -> sb.append("Provide a cue card with one topic and 3-4 bullet prompts. Format: 'Describe [topic]. You should say: [prompt1], [prompt2], [prompt3]'\n");
            case "part3" -> sb.append("Ask abstract, analytical questions requiring opinions, comparisons, evaluation. Answers should be 3-5 sentences with examples.\n");
        }
        sb.append("Target: ").append(config.getTargetLevel())
          .append(" | Role: ").append(config.getAiRole())
          .append(" | Style: ").append(config.getResponseStyle());
        return sb.toString();
    }
}
