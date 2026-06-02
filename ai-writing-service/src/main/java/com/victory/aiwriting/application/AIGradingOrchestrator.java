package com.victory.aiwriting.application;

import com.victory.aiwriting.application.dto.AIGradingResponseDTO;
import com.victory.aiwriting.domain.model.AIGradingResult;
import com.victory.aiwriting.domain.model.GradingConfidence;
import com.victory.aiwriting.domain.model.PromptContext;
import com.victory.aiwriting.domain.model.SampleEssay;
import com.victory.aiwriting.domain.model.WritingRubric;
import com.victory.aiwriting.domain.port.AIProvider;
import com.victory.aiwriting.domain.service.*;
import com.victory.aiwriting.exception.AIGradingException;
import com.victory.aiwriting.exception.AIProviderException;
import com.victory.aiwriting.exception.AIQuotaExceededException;
import com.victory.aiwriting.exception.AIParseException;
import com.victory.aiwriting.infrastructure.cache.AICacheService;
import com.victory.aiwriting.infrastructure.persistence.AIGradingAuditLogEntity;
import com.victory.aiwriting.infrastructure.persistence.AIGradingAuditLogRepository;
import com.victory.aiwriting.infrastructure.persistence.AIGradingResultEntity;
import com.victory.aiwriting.infrastructure.persistence.AIGradingResultRepository;
import com.victory.aiwriting.infrastructure.quota.AIQuotaService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIGradingOrchestrator {

    private final AIProvider aiProvider;
    private final SampleRetriever sampleRetriever;
    private final PromptBuilder promptBuilder;
    private final RubricLoader rubricLoader;
    private final ResponseParser responseParser;
    private final AIGradingResultRepository resultRepo;
    private final AIGradingAuditLogRepository auditRepo;
    private final AIQuotaService quotaService;
    private final AICacheService cacheService;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public AIGradingResult grade(Long submissionId, String triggeredBy, String userRole) {
        quotaService.checkQuota(triggeredBy, userRole);

        var submission = loadSubmission(submissionId);
        var cacheKey = "grade:" + submissionId;
        var cached = cacheService.get(cacheKey);
        if (cached != null) return cached;

        var taskType = rubricLoader.detectTaskType(getQuestionGroupId(submission));
        var topic = rubricLoader.detectTopic(getQuestionGroupId(submission));
        String essayText = getSubmissionText(submission);
        String promptText = getPromptText(submission);
        Integer wordCount = getWordCount(submission);

        var result = gradeCore(essayText, taskType, topic, promptText, wordCount, triggeredBy);

        result.setSubmissionId(submissionId);

        var entity = AIGradingResultEntity.from(result);
        entity = resultRepo.save(entity);
        result.setId(entity.getId());

        cacheService.put(cacheKey, result);
        updateSubmissionWithAiGrade(submission, result);

        return result;
    }

    public AIGradingResult gradeText(String essayText, String taskType, String topic) {
        return gradeCore(essayText, taskType, topic, "", 0, "test-user");
    }

    private AIGradingResult gradeCore(String essayText, String taskType, String topic,
                                       String promptText, int wordCount, String triggeredBy) {
        var rubric = rubricLoader.loadForTask(taskType);

        var diversified = sampleRetriever.retrieveDiversified(
            essayText, taskType, topic, promptBuilder.getFewShotCount());
        var samples = diversified.samples();

        var prompt = promptBuilder.build(
            essayText, taskType, topic, promptText, wordCount, rubric, samples);

        long startMs = System.currentTimeMillis();
        String rawResponse = aiProvider.chat(prompt);
        String providerUsed = aiProvider.getProviderName();
        String modelUsed = aiProvider.getModelName();
        long latencyMs = System.currentTimeMillis() - startMs;

        AIGradingResult result;
        try {
            result = responseParser.parse(rawResponse, providerUsed, modelUsed);
        } catch (AIParseException e) {
            log.error("Failed to parse AI response after {}ms: {}", latencyMs, e.getMessage());
            throw e;
        }

        double criteriaStdDev = calculateCriteriaStdDev(result);
        int referenceWithComment = (int) samples.stream().filter(SampleEssay::isHasComment).count();
        double refQuality = (double) referenceWithComment / Math.max(samples.size(), 1);

        var confidence = GradingConfidence.calculate(
            diversified.avgSimilarity(), criteriaStdDev, refQuality, diversified.bandSpread()
        );

        result.setReferenceSampleIds(samples.stream().map(SampleEssay::getId).toList());
        result.setPromptVersion(promptBuilder.getVersion());
        result.setLatencyMs(latencyMs);
        result.setStatus("COMPLETED");
        result.setConfidenceScore(confidence.getOverall());

        return result;
    }

    private void updateSubmissionWithAiGrade(Object submission, AIGradingResult result) {
        Long submissionId = getSubmissionId(submission);
        entityManager.createNativeQuery("""
            UPDATE student_writing_submissions
            SET ai_graded_by = :provider,
                ai_confidence_score = :confidence
            WHERE id = :id
            """)
            .setParameter("provider", result.getProvider())
            .setParameter("confidence", result.getConfidenceScore())
            .setParameter("id", submissionId)
            .executeUpdate();
    }

    private void saveAuditLog(Long submissionId, Long resultId, PromptContext prompt,
                               String rawResponse, boolean success, String error,
                               String triggeredBy, String provider, String model,
                               long latencyMs) {
        var audit = AIGradingAuditLogEntity.builder()
            .submissionId(submissionId)
            .gradingResultId(resultId)
            .provider(provider)
            .model(model)
            .systemPrompt(prompt.getSystemPrompt())
            .userPrompt(prompt.toFullPrompt())
            .rawResponse(rawResponse)
            .success(success)
            .errorMessage(error)
            .triggeredBy(triggeredBy)
            .latencyMs(latencyMs)
            .build();
        auditRepo.save(audit);
    }

    @Transactional
    public AIGradingResponseDTO approve(Long submissionId, Long approvedBy, String adjustments) {
        var result = resultRepo.findTopBySubmissionIdOrderByCreatedAtDesc(submissionId)
            .orElseThrow(() -> new AIGradingException("No AI grading result found"));

        result.setStatus("APPROVED");
        result.setApprovedBy(approvedBy);
        result.setTeacherAdjustments(adjustments);
        resultRepo.save(result);

        return AIGradingResponseDTO.from(result.toDomain(), null);
    }

    @Transactional
    public void reject(Long submissionId, String reason) {
        var result = resultRepo.findTopBySubmissionIdOrderByCreatedAtDesc(submissionId)
            .orElseThrow(() -> new AIGradingException("No AI grading result found"));

        result.setStatus("REJECTED");
        result.setErrorMessage(reason);
        resultRepo.save(result);

        entityManager.createNativeQuery("""
            UPDATE student_writing_submissions
            SET ai_graded_by = NULL, ai_confidence_score = NULL
            WHERE id = :id
            """)
            .setParameter("id", submissionId)
            .executeUpdate();
    }

    public AIGradingResponseDTO getResult(Long submissionId) {
        var result = resultRepo.findTopBySubmissionIdOrderByCreatedAtDesc(submissionId)
            .orElseThrow(() -> new AIGradingException("No AI grading result"));
        return AIGradingResponseDTO.from(result.toDomain(), null);
    }

    // Helpers to avoid compile errors - these would use actual JPA entities
    private Object loadSubmission(Long id) {
        var list = entityManager.createNativeQuery(
            "SELECT * FROM student_writing_submissions WHERE id = :id")
            .setParameter("id", id)
            .getResultList();
        if (list.isEmpty()) throw new AIGradingException("Submission not found: " + id);
        return list.get(0);
    }

    private Long getSubmissionId(Object submission) {
        return (Long) ((Object[]) submission)[0];
    }

    private Long getQuestionGroupId(Object submission) {
        Object[] cols = (Object[]) submission;
        for (int i = 0; i < cols.length; i++) {
            if (cols[i] instanceof Number n && i > 0) {
                // question_group_id is typically column index depends on query
                return n.longValue();
            }
        }
        return 0L;
    }

    private String getSubmissionText(Object submission) {
        Object[] cols = (Object[]) submission;
        for (Object col : cols) {
            if (col instanceof String s && s.length() > 50) return s;
        }
        return "";
    }

    private String getPromptText(Object submission) {
        Long qgId = getQuestionGroupId(submission);
        var list = entityManager.createNativeQuery(
            "SELECT title FROM question_groups WHERE id = :id")
            .setParameter("id", qgId)
            .getResultList();
        return list.isEmpty() ? "" : (String) list.get(0);
    }

    private Integer getWordCount(Object submission) {
        Object[] cols = (Object[]) submission;
        String text = getSubmissionText(submission);
        return text.isEmpty() ? 0 : text.split("\\s+").length;
    }

    private double calculateCriteriaStdDev(AIGradingResult result) {
        var scores = new double[]{
            result.getTaskResponse() != null ? result.getTaskResponse().getBand() : 0,
            result.getCoherenceCohesion() != null ? result.getCoherenceCohesion().getBand() : 0,
            result.getLexicalResource() != null ? result.getLexicalResource().getBand() : 0,
            result.getGrammaticalRange() != null ? result.getGrammaticalRange().getBand() : 0
        };
        double mean = 0;
        for (double s : scores) mean += s;
        mean /= scores.length;
        double sumSq = 0;
        for (double s : scores) sumSq += Math.pow(s - mean, 2);
        return Math.sqrt(sumSq / scores.length);
    }
}
