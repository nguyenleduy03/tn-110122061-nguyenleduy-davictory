package com.victory.aispeaking.application;

import com.victory.aispeaking.config.AIConfigProperties;
import com.victory.aispeaking.domain.model.*;
import com.victory.aispeaking.domain.service.*;
import com.victory.aispeaking.domain.port.AIProvider;
import com.victory.aispeaking.domain.port.STTProvider;
import com.victory.aispeaking.domain.port.TTSProvider;
import com.victory.aispeaking.infrastructure.cache.SpeakingCacheService;
import com.victory.aispeaking.infrastructure.quota.AIQuotaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpeakingOrchestrator {

    private final SessionManager sessionManager;
    private final ConversationManager conversationManager;
    private final ScoringPipeline scoringPipeline;
    private final AIProvider conversationProvider;
    private final STTProvider sttProvider;
    private final TTSProvider ttsProvider;
    private final AIQuotaService quotaService;
    private final SpeakingCacheService cacheService;
    private final AIConfigProperties config;

    public SpeakingSession createSession(Long userId, String userName, String userRole, SessionConfig cfg) {
        quotaService.checkQuota(userId, userRole);
        SpeakingSession session = sessionManager.createSession(userId, userName, userRole, cfg);
        quotaService.incrementAndGet(userId, userRole);
        log.info("Created speaking session: {} for user: {} with config: {}",
                session.getId(), userId, cfg.getFocusArea());
        return session;
    }

    public String generateQuestion(String sessionId) {
        SpeakingSession session = getSession(sessionId);
        List<SpeakingTurn> history = sessionManager.getTurns(sessionId);
        String question = conversationManager.generateNextQuestion(session.getConfig(), history);

        SpeakingTurn turn = SpeakingTurn.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(sessionId)
                .turnNumber(history.size() + 1)
                .questionText(question)
                .questionId("Q-" + (history.size() + 1))
                .part(session.getCurrentPhase())
                .askedAt(LocalDateTime.now())
                .build();

        sessionManager.addTurn(sessionId, turn);
        return question;
    }

    public SpeakingTurn submitAnswer(String sessionId, String answerText, Integer durationMs) {
        SpeakingSession session = getSession(sessionId);
        List<SpeakingTurn> turns = sessionManager.getTurns(sessionId);
        if (turns.isEmpty()) {
            throw new IllegalStateException("No active question. Generate a question first.");
        }

        SpeakingTurn lastTurn = turns.get(turns.size() - 1);
        if (lastTurn.getAnswerText() != null) {
            throw new IllegalStateException("Current question already answered. Generate next question.");
        }

        SpeakingTurn answered = SpeakingTurn.builder()
                .id(lastTurn.getId())
                .sessionId(lastTurn.getSessionId())
                .turnNumber(lastTurn.getTurnNumber())
                .questionText(lastTurn.getQuestionText())
                .questionId(lastTurn.getQuestionId())
                .answerText(answerText)
                .audioUrl(lastTurn.getAudioUrl())
                .answerDurationMs(durationMs != null ? durationMs : 0)
                .askedAt(lastTurn.getAskedAt())
                .answeredAt(LocalDateTime.now())
                .part(lastTurn.getPart())
                .topicLabel(lastTurn.getTopicLabel())
                .build();

        sessionManager.addTurn(sessionId, answered);
        return answered;
    }

    public SpeechSegment submitAudio(String sessionId, InputStream audioStream, String mimeType) {
        return sttProvider.transcribe(audioStream, mimeType);
    }

    public byte[] synthesizeSpeech(String text, String voiceId) {
        return ttsProvider.synthesizeBytes(text, voiceId);
    }

    public String generateFollowUp(String sessionId) {
        SpeakingSession session = getSession(sessionId);
        List<SpeakingTurn> turns = sessionManager.getTurns(sessionId);
        List<SpeakingTurn> answeredTurns = turns.stream()
                .filter(t -> t.getAnswerText() != null)
                .collect(Collectors.toList());

        if (answeredTurns.isEmpty()) {
            return generateQuestion(sessionId);
        }

        SpeakingTurn lastAnswer = answeredTurns.get(answeredTurns.size() - 1);
        String followUp = conversationManager.generateFollowUp(
                session.getConfig(), turns, lastAnswer.getAnswerText());

        SpeakingTurn turn = SpeakingTurn.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(sessionId)
                .turnNumber(turns.size() + 1)
                .questionText(followUp)
                .questionId("Q-" + (turns.size() + 1))
                .part(session.getCurrentPhase())
                .askedAt(LocalDateTime.now())
                .build();

        sessionManager.addTurn(sessionId, turn);
        return followUp;
    }

    public String endPart(String sessionId) {
        SpeakingSession session = getSession(sessionId);
        List<SpeakingTurn> turns = sessionManager.getTurns(sessionId);
        return conversationManager.endSessionMessage(
                session.getConfig(), turns, session.getCurrentPhase());
    }

    public SpeakingSession nextPhase(String sessionId) {
        List<String> PHASES = List.of("INTRODUCTION", "PART1", "PART2", "PART3", "COMPLETED");
        SpeakingSession session = getSession(sessionId);
        int currentIdx = PHASES.indexOf(session.getCurrentPhase());
        if (currentIdx < 0 || currentIdx >= PHASES.size() - 1) {
            return sessionManager.completeSession(sessionId).orElse(session);
        }
        String nextPhase = PHASES.get(currentIdx + 1);
        return sessionManager.updatePhase(sessionId, nextPhase)
                .orElseThrow(() -> new IllegalStateException("Failed to update phase"));
    }

    public SpeakingResult evaluateSession(String sessionId, Long userId) {
        List<SpeakingTurn> turns = sessionManager.getTurns(sessionId);
        List<SpeakingTurn> answeredTurns = turns.stream()
                .filter(t -> t.getAnswerText() != null && !t.getAnswerText().isBlank())
                .collect(Collectors.toList());

        if (answeredTurns.isEmpty()) {
            throw new IllegalArgumentException("No answers to evaluate in session: " + sessionId);
        }

        String cacheKey = "speaking_result:" + sessionId;
        SpeakingResult cached = cacheService.get(cacheKey, SpeakingResult.class);
        if (cached != null) {
            log.info("Returning cached result for session: {}", sessionId);
            return cached;
        }

        SpeakingResult result = scoringPipeline.evaluateFullSession(
                sessionId, userId, answeredTurns);

        if (result.isComplete()) {
            cacheService.put(cacheKey, result);
        }
        return result;
    }

    public SpeakingSession completeSession(String sessionId) {
        return sessionManager.completeSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));
    }

    public SpeakingSession getSession(String sessionId) {
        return sessionManager.getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));
    }

    public List<SpeakingTurn> getTurns(String sessionId) {
        return sessionManager.getTurns(sessionId);
    }
}
