package com.victory.aiwriting.controller;

import com.victory.aiwriting.application.AIBatchGradingService;
import com.victory.aiwriting.application.AIGradingOrchestrator;
import com.victory.aiwriting.application.dto.AIApprovalRequestDTO;
import com.victory.aiwriting.application.dto.AIBatchGradingRequestDTO;
import com.victory.aiwriting.application.dto.AIBatchGradingStatusDTO;
import com.victory.aiwriting.application.dto.AIGradingResponseDTO;
import com.victory.aiwriting.domain.model.AIGradingResult;
import com.victory.aiwriting.exception.AIGradingException;
import com.victory.aiwriting.exception.AIParseException;
import com.victory.aiwriting.exception.AIProviderException;
import com.victory.aiwriting.exception.AIQuotaExceededException;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/writing")
@RequiredArgsConstructor
public class AIGradingController {

    private final AIGradingOrchestrator orchestrator;
    private final AIBatchGradingService batchService;

    @PostMapping("/grade/{submissionId}")
    public ResponseEntity<?> gradeSingle(
            @PathVariable Long submissionId,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String role) {
        try {
            var result = orchestrator.grade(submissionId, userId, role);
            return ResponseEntity.ok(toDTO(result));
        } catch (AIQuotaExceededException e) {
            return ResponseEntity.status(429).body(Map.of("error", e.getMessage()));
        } catch (AIParseException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "AI returned invalid format",
                "rawResponse", e.getRawResponse()));
        } catch (AIProviderException e) {
            return ResponseEntity.status(503).body(Map.of(
                "error", "AI service unavailable",
                "detail", e.getMessage()));
        } catch (AIGradingException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/test-grade")
    public ResponseEntity<?> testGrade(
            @RequestBody TestGradeRequest request) {
        try {
            var result = orchestrator.gradeText(
                request.getEssayText(),
                request.getTaskType() != null ? request.getTaskType() : "TASK2_ACADEMIC",
                request.getTopic() != null ? request.getTopic() : "General",
                request.getPromptText() != null ? request.getPromptText() : ""
            );
            return ResponseEntity.ok(toDTO(result));
        } catch (AIParseException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "AI returned invalid format",
                "rawResponse", e.getRawResponse()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/batch")
    public ResponseEntity<?> gradeBatch(
            @RequestBody AIBatchGradingRequestDTO request,
            @RequestHeader("X-User-Id") String userId) {
        try {
            var batchId = batchService.startBatch(request, userId);
            return ResponseEntity.accepted().body(Map.of(
                "batchId", batchId,
                "status", "PROCESSING",
                "total", request.getSubmissionIds().size()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Batch processing failed"));
        }
    }

    @GetMapping("/batch/{batchId}")
    public ResponseEntity<?> getBatchStatus(@PathVariable String batchId) {
        var status = batchService.getBatchStatus(batchId);
        return ResponseEntity.ok(status);
    }

    @GetMapping("/result/{submissionId}")
    public ResponseEntity<?> getResult(@PathVariable Long submissionId) {
        try {
            var result = orchestrator.getResult(submissionId);
            return ResponseEntity.ok(result);
        } catch (AIGradingException e) {
            return ResponseEntity.ok(Map.of(
                "submissionId", submissionId,
                "status", "NOT_GRADED"));
        }
    }

    @PostMapping("/approve/{submissionId}")
    public ResponseEntity<?> approve(
            @PathVariable Long submissionId,
            @RequestBody AIApprovalRequestDTO request,
            @RequestHeader("X-User-Id") Long teacherId) {
        try {
            var result = orchestrator.approve(submissionId, teacherId, request.getAdjustments());
            return ResponseEntity.ok(result);
        } catch (AIGradingException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reject/{submissionId}")
    public ResponseEntity<?> reject(
            @PathVariable Long submissionId,
            @RequestBody AIApprovalRequestDTO request) {
        try {
            orchestrator.reject(submissionId, request.getReason());
            return ResponseEntity.ok(Map.of("status", "REJECTED"));
        } catch (AIGradingException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private AIGradingResponseDTO toDTO(AIGradingResult r) {
        return AIGradingResponseDTO.builder()
            .gradingId(r.getId())
            .submissionId(r.getSubmissionId())
            .provider(r.getProvider())
            .model(r.getModel())
            .overallBand(r.getOverallBand())
            .overallFeedback(r.getOverallFeedback())
            .strengths(r.getStrengths())
            .weaknesses(r.getWeaknesses())
            .improvementPriority(r.getImprovementPriority())
            .confidenceScore(r.getConfidenceScore())
            .referenceSampleIds(r.getReferenceSampleIds())
            .status(r.getStatus())
            .promptVersion(r.getPromptVersion())
            .latencyMs(r.getLatencyMs())
            .taskResponse(toCriteriaDTO(r.getTaskResponse()))
            .coherenceCohesion(toCriteriaDTO(r.getCoherenceCohesion()))
            .lexicalResource(toCriteriaDTO(r.getLexicalResource()))
            .grammaticalRange(toCriteriaDTO(r.getGrammaticalRange()))
            .build();
    }

    @Data
    public static class TestGradeRequest {
        private String essayText;
        private String taskType;
        private String topic;
        private String promptText;
    }

    private AIGradingResponseDTO.CriteriaScoreDTO toCriteriaDTO(
            com.victory.aiwriting.domain.model.CriteriaScore cs) {
        if (cs == null) return null;
        return AIGradingResponseDTO.CriteriaScoreDTO.builder()
            .band(cs.getBand())
            .bandJustification(cs.getBandJustification())
            .strengths(cs.getStrengths())
            .weaknesses(cs.getWeaknesses())
            .evidenceFromEssay(cs.getEvidenceFromEssay())
            .detailedFeedback(cs.getDetailedFeedback())
            .build();
    }
}
