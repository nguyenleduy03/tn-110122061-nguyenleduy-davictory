package com.victory.aiwriting.application;

import com.victory.aiwriting.application.dto.AIBatchGradingRequestDTO;
import com.victory.aiwriting.application.dto.AIBatchGradingStatusDTO;
import com.victory.aiwriting.application.dto.AIGradingResponseDTO;
import com.victory.aiwriting.domain.model.AIGradingResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIBatchGradingService {

    private final AIGradingOrchestrator orchestrator;
    private final Map<String, AIBatchGradingStatusDTO> batches = new ConcurrentHashMap<>();

    public String startBatch(AIBatchGradingRequestDTO request, String teacherId) {
        var batchId = UUID.randomUUID().toString();
        var status = AIBatchGradingStatusDTO.builder()
            .batchId(batchId)
            .total(request.getSubmissionIds().size())
            .completed(0)
            .failed(0)
            .status("PROCESSING")
            .results(new ArrayList<>())
            .build();
        batches.put(batchId, status);
        processBatchAsync(request, teacherId, batchId);
        return batchId;
    }

    @Async
    public void processBatchAsync(AIBatchGradingRequestDTO request, String teacherId, String batchId) {
        var status = batches.get(batchId);
        for (Long submissionId : request.getSubmissionIds()) {
            try {
                var result = orchestrator.grade(submissionId, teacherId, "TEACHER");
                status.getResults().add(toDTO(result));
                status.setCompleted(status.getCompleted() + 1);
            } catch (Exception e) {
                log.error("Failed to grade submission {}: {}", submissionId, e.getMessage());
                status.getResults().add(null);
                status.setFailed(status.getFailed() + 1);
            }
        }
        status.setStatus("COMPLETED");
    }

    public AIBatchGradingStatusDTO getBatchStatus(String batchId) {
        var status = batches.get(batchId);
        if (status == null) {
            return AIBatchGradingStatusDTO.builder()
                .batchId(batchId)
                .status("NOT_FOUND")
                .build();
        }
        return status;
    }

    private AIGradingResponseDTO toDTO(AIGradingResult r) {
        if (r == null) return null;
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
            .status(r.getStatus())
            .latencyMs(r.getLatencyMs())
            .build();
    }
}
