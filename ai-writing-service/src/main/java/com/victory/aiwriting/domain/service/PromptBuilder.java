package com.victory.aiwriting.domain.service;

import com.victory.aiwriting.domain.model.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PromptBuilder {

    @Value("${app.ai.prompt.version}")
    private String version;

    @Value("${app.ai.prompt.few-shot-count}")
    private int fewShotCount;

    @Value("${app.ai.prompt.include-examiner-comments}")
    private boolean includeExaminerComments;

    @Value("classpath:ai/prompt/templates/system_role.txt")
    private Resource systemRoleResource;

    @Value("classpath:ai/prompt/templates/output_schema.json")
    private Resource outputSchemaResource;

    private final RubricLoader rubricLoader;

    public PromptContext build(String essayText, String taskType, String topic,
                                String promptText, Integer wordCount,
                                WritingRubric rubric, List<SampleEssay> samples) {
        return PromptContext.builder()
            .systemPrompt(loadSystemPrompt())
            .rubricSection(buildRubricSection(rubric))
            .fewShotSection(buildFewShotSection(samples))
            .userSection(buildUserSection(essayText, taskType, topic, promptText, wordCount))
            .outputSchema(loadOutputSchema())
            .build();
    }

    String loadSystemPrompt() {
        try (var reader = new BufferedReader(
                new InputStreamReader(systemRoleResource.getInputStream(), StandardCharsets.UTF_8))) {
            return reader.lines().collect(Collectors.joining("\n"));
        } catch (Exception e) {
            return "You are a certified IELTS examiner.";
        }
    }

    String loadOutputSchema() {
        try (var reader = new BufferedReader(
                new InputStreamReader(outputSchemaResource.getInputStream(), StandardCharsets.UTF_8))) {
            return reader.lines().collect(Collectors.joining("\n"));
        } catch (Exception e) {
            return "{}";
        }
    }

    String buildRubricSection(WritingRubric rubric) {
        var sb = new StringBuilder();
        sb.append("=== IELTS WRITING ").append(rubric.getTaskType()).append(" BAND DESCRIPTORS ===\n\n");

        appendCriteriaRubric(sb, "TASK RESPONSE / TASK ACHIEVEMENT", rubric.getTaskResponse());
        appendCriteriaRubric(sb, "COHERENCE & COHESION", rubric.getCoherenceCohesion());
        appendCriteriaRubric(sb, "LEXICAL RESOURCE", rubric.getLexicalResource());
        appendCriteriaRubric(sb, "GRAMMATICAL RANGE & ACCURACY", rubric.getGrammaticalRange());

        return sb.toString();
    }

    private void appendCriteriaRubric(StringBuilder sb, String title, List<RubricBand> bands) {
        sb.append("=== ").append(title).append(" ===\n\n");

        for (var band : bands) {
            if (band.getBand() < 5) continue;

            sb.append("Band ").append((int) band.getBand()).append(":\n");
            sb.append("  ").append(band.getDescriptor()).append("\n");

            if (band.getKeyIndicators() != null && !band.getKeyIndicators().isEmpty()) {
                sb.append("  Key indicators: ");
                sb.append(String.join("; ", band.getKeyIndicators())).append("\n");
            }

            if (band.getCommonErrors() != null && !band.getCommonErrors().isEmpty()) {
                sb.append("  Watch for: ");
                sb.append(String.join("; ", band.getCommonErrors())).append("\n");
            }

            sb.append("\n");
        }
    }

    String buildFewShotSection(List<SampleEssay> samples) {
        var sb = new StringBuilder();
        sb.append("Below are official IELTS sample essays with examiner-assigned band scores.\n")
          .append("Each sample includes: the PROMPT (exam question), the STUDENT ESSAY, the BAND SCORE, and the EXAMINER COMMENT.\n")
          .append("Use them as REFERENCE for calibration, NOT as templates.\n")
          .append("Grade the student essay independently.\n\n");

        for (int i = 0; i < samples.size(); i++) {
            var s = samples.get(i);
            sb.append(String.format("=== REFERENCE SAMPLE %d (Band %.1f) ===\n", i + 1, s.getBandScore()));

            sb.append("--- Task Type ---\n").append(s.getTaskType()).append("\n");
            sb.append("--- Topic ---\n").append(s.getTopic() != null ? s.getTopic() : "N/A").append("\n");

            if (s.getPromptText() != null && !s.getPromptText().isBlank()) {
                sb.append("--- Prompt (Exam Question) ---\n").append(s.getPromptText()).append("\n");
            }

            sb.append("--- Student Essay ---\n").append(s.getEssayText()).append("\n");
            sb.append("--- Assigned Band Score ---\n").append(String.format("%.1f / 9.0\n", s.getBandScore()));

            if (includeExaminerComments && s.isHasComment() && s.getExaminerComment() != null) {
                sb.append("--- Examiner Comment ---\n").append(s.getExaminerComment()).append("\n");
            }

            sb.append("\n");
        }
        return sb.toString();
    }

    String buildUserSection(String essayText, String taskType, String topic,
                             String promptText, Integer wordCount) {
        return String.format("""
            === STUDENT ESSAY TO GRADE ===

            Task Type: %s
            Topic: %s
            Prompt: %s
            Word Count: %d

            Student Essay:
            %s

            === OUTPUT FORMAT ===
            Return a JSON object with this EXACT structure (no extra text):
            %s
            """,
            taskType != null ? taskType : "Unknown",
            topic != null ? topic : "Unknown",
            promptText != null ? promptText : "",
            wordCount != null ? wordCount : 0,
            essayText,
            loadOutputSchema()
        );
    }

    public String getVersion() {
        return version;
    }

    public int getFewShotCount() {
        return fewShotCount;
    }
}
