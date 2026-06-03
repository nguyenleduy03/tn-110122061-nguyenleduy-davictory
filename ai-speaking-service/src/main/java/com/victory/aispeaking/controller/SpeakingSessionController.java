package com.victory.aispeaking.controller;

import com.victory.aispeaking.application.SpeakingOrchestrator;
import com.victory.aispeaking.application.dto.*;
import com.victory.aispeaking.domain.model.*;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.io.ByteArrayInputStream;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/speaking")
public class SpeakingSessionController {

    private final SpeakingOrchestrator orchestrator;

    public SpeakingSessionController(SpeakingOrchestrator orchestrator) {
        this.orchestrator = orchestrator;
    }

    @PostMapping("/sessions")
    public ResponseEntity<Map<String, Object>> createSession(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Name") String userName,
            @RequestHeader("X-User-Role") String userRole,
            @Valid @RequestBody StartSessionRequest request) {

        SessionConfig config = SessionConfig.builder()
                .targetLanguage(request.getTargetLanguage())
                .scenario(request.getScenario())
                .focusArea(request.getFocusArea())
                .topic(request.getTopic())
                .currentLevel(request.getCurrentLevel())
                .targetLevel(request.getTargetLevel())
                .practiceMode(request.getPracticeMode())
                .aiRole(request.getAiRole())
                .responseStyle(request.getResponseStyle())
                .voiceAccent(request.getVoiceAccent())
                .feedbackLanguage(request.getFeedbackLanguage())
                .build();

        SpeakingSession session = orchestrator.createSession(userId, userName, userRole, config);

        return ResponseEntity.ok(Map.of(
                "sessionId", session.getId(),
                "status", session.getStatus(),
                "currentPhase", session.getCurrentPhase(),
                "config", config
        ));
    }

    @PostMapping("/sessions/{sessionId}/question")
    public ResponseEntity<Map<String, Object>> generateQuestion(@PathVariable String sessionId) {
        String question = orchestrator.generateQuestion(sessionId);
        return ResponseEntity.ok(Map.of(
                "question", question,
                "sessionId", sessionId
        ));
    }

    @PostMapping("/sessions/{sessionId}/answer")
    public ResponseEntity<Map<String, Object>> submitAnswer(
            @PathVariable String sessionId,
            @Valid @RequestBody SubmitAnswerRequest request) {

        SpeakingTurn turn = orchestrator.submitAnswer(sessionId, request.getAnswerText(), request.getDurationMs());

        return ResponseEntity.ok(Map.of(
                "turnNumber", turn.getTurnNumber(),
                "answerText", turn.getAnswerText(),
                "answeredAt", turn.getAnsweredAt().toString()
        ));
    }

    @PostMapping(value = "/sessions/{sessionId}/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> submitAudio(
            @PathVariable String sessionId,
            @RequestParam("audio") MultipartFile audioFile) {

        try {
            SpeechSegment segment = orchestrator.submitAudio(
                    sessionId,
                    new ByteArrayInputStream(audioFile.getBytes()),
                    audioFile.getContentType());

            return ResponseEntity.ok(Map.of(
                    "text", segment.getText(),
                    "confidence", segment.getConfidence(),
                    "isFinal", segment.isFinal()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Audio processing failed: " + e.getMessage()));
        }
    }

    @PostMapping("/sessions/{sessionId}/follow-up")
    public ResponseEntity<Map<String, Object>> generateFollowUp(@PathVariable String sessionId) {
        String followUp = orchestrator.generateFollowUp(sessionId);
        return ResponseEntity.ok(Map.of(
                "question", followUp,
                "sessionId", sessionId
        ));
    }

    @PostMapping("/sessions/{sessionId}/next-phase")
    public ResponseEntity<Map<String, Object>> nextPhase(@PathVariable String sessionId) {
        SpeakingSession session = orchestrator.nextPhase(sessionId);
        return ResponseEntity.ok(Map.of(
                "sessionId", session.getId(),
                "currentPhase", session.getCurrentPhase(),
                "status", session.getStatus()
        ));
    }

    @PostMapping("/sessions/{sessionId}/end-part")
    public ResponseEntity<Map<String, Object>> endPart(@PathVariable String sessionId) {
        String message = orchestrator.endPart(sessionId);
        return ResponseEntity.ok(Map.of(
                "message", message,
                "sessionId", sessionId
        ));
    }

    @PostMapping("/sessions/{sessionId}/end")
    public ResponseEntity<Map<String, Object>> endSession(@PathVariable String sessionId) {
        SpeakingSession session = orchestrator.completeSession(sessionId);
        return ResponseEntity.ok(Map.of(
                "sessionId", session.getId(),
                "status", "COMPLETED"
        ));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<?> getSession(@PathVariable String sessionId) {
        try {
            SpeakingSession session = orchestrator.getSession(sessionId);
            List<SpeakingTurn> turns = orchestrator.getTurns(sessionId);

            List<SpeakingTurnDTO> turnDTOs = turns.stream()
                    .map(t -> SpeakingTurnDTO.builder()
                            .turnNumber(t.getTurnNumber())
                            .questionText(t.getQuestionText())
                            .questionId(t.getQuestionId())
                            .answerText(t.getAnswerText())
                            .audioUrl(t.getAudioUrl())
                            .answerDurationMs(t.getAnswerDurationMs())
                            .askedAt(t.getAskedAt())
                            .answeredAt(t.getAnsweredAt())
                            .part(t.getPart())
                            .build())
                    .collect(Collectors.toList());

            SpeakingSessionDTO dto = SpeakingSessionDTO.builder()
                    .id(session.getId())
                    .userId(session.getUserId())
                    .userName(session.getUserName())
                    .status(session.getStatus())
                    .currentPhase(session.getCurrentPhase())
                    .totalTurns(session.getTotalTurns())
                    .startedAt(session.getStartedAt())
                    .completedAt(session.getCompletedAt())
                    .turns(turnDTOs)
                    .build();

            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/sessions/{sessionId}/evaluate")
    public ResponseEntity<Map<String, Object>> evaluateSession(
            @PathVariable String sessionId,
            @RequestHeader("X-User-Id") Long userId) {

        try {
            SpeakingResult result = orchestrator.evaluateSession(sessionId, userId);

            SpeakingResultDTO dto = SpeakingResultDTO.builder()
                    .resultId(result.getId())
                    .sessionId(result.getSessionId())
                    .overallBand(result.getOverallBand())
                    .fluencyCoherence(toDTO(result.getFluencyCoherence()))
                    .lexicalResource(toDTO(result.getLexicalResource()))
                    .grammaticalRangeAccuracy(toDTO(result.getGrammaticalRangeAccuracy()))
                    .pronunciation(toDTO(result.getPronunciation()))
                    .overallFeedback(result.getOverallFeedback())
                    .improvementPriority(result.getImprovementPriority())
                    .strengths(result.getStrengths())
                    .weaknesses(result.getWeaknesses())
                    .provider(result.getProvider())
                    .model(result.getModel())
                    .confidenceScore(result.getConfidenceScore())
                    .status(result.getStatus())
                    .errorMessage(result.getErrorMessage())
                    .build();

            return ResponseEntity.ok(Map.of(
                    "sessionId", sessionId,
                    "result", dto
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping(value = "/tts", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<byte[]> synthesizeSpeech(
            @RequestParam String text,
            @RequestParam(defaultValue = "alloy") String voice) {

        byte[] audio = orchestrator.synthesizeSpeech(text, voice);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("audio/mpeg"))
                .body(audio);
    }

    private SpeakingResultDTO.CriteriaScoreDTO toDTO(CriteriaScore score) {
        if (score == null) return null;
        return SpeakingResultDTO.CriteriaScoreDTO.builder()
                .code(score.getCode())
                .displayName(score.getDisplayName())
                .band(score.getBand())
                .strengths(score.getStrengths())
                .weaknesses(score.getWeaknesses())
                .detailedFeedback(score.getDetailedFeedback())
                .build();
    }
}
