package com.victory.aispeaking.domain.service;

import com.victory.aispeaking.domain.model.SessionConfig;
import com.victory.aispeaking.domain.model.SpeakingSession;
import com.victory.aispeaking.domain.model.SpeakingTurn;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionManager {

    private final Map<String, SessionState> activeSessions = new ConcurrentHashMap<>();

    public SpeakingSession createSession(Long userId, String userName, String userRole, SessionConfig config) {
        String sessionId = UUID.randomUUID().toString();

        SpeakingSession session = SpeakingSession.builder()
                .id(sessionId)
                .userId(userId)
                .userName(userName)
                .userRole(userRole)
                .config(config)
                .status("ACTIVE")
                .currentPhase("INTRODUCTION")
                .turns(new ArrayList<>())
                .totalTurns(0)
                .startedAt(LocalDateTime.now())
                .build();

        activeSessions.put(sessionId, new SessionState(session, new ArrayList<>()));
        return session;
    }

    public Optional<SpeakingSession> getSession(String sessionId) {
        SessionState state = activeSessions.get(sessionId);
        return state != null ? Optional.of(state.session) : Optional.empty();
    }

    public Optional<SpeakingSession> addTurn(String sessionId, SpeakingTurn turn) {
        SessionState state = activeSessions.get(sessionId);
        if (state == null) return Optional.empty();

        state.turns.add(turn);
        SpeakingSession updated = SpeakingSession.builder()
                .id(state.session.getId())
                .userId(state.session.getUserId())
                .userName(state.session.getUserName())
                .userRole(state.session.getUserRole())
                .config(state.session.getConfig())
                .status(state.session.getStatus())
                .currentPhase(state.session.getCurrentPhase())
                .turns(Collections.unmodifiableList(new ArrayList<>(state.turns)))
                .totalTurns(state.turns.size())
                .startedAt(state.session.getStartedAt())
                .completedAt(state.session.getCompletedAt())
                .transcriptUrl(state.session.getTranscriptUrl())
                .notes(state.session.getNotes())
                .build();

        state.session = updated;
        return Optional.of(updated);
    }

    public Optional<SpeakingSession> updatePhase(String sessionId, String phase) {
        SessionState state = activeSessions.get(sessionId);
        if (state == null) return Optional.empty();

        SpeakingSession updated = SpeakingSession.builder()
                .id(state.session.getId())
                .userId(state.session.getUserId())
                .userName(state.session.getUserName())
                .userRole(state.session.getUserRole())
                .config(state.session.getConfig())
                .status(state.session.getStatus())
                .currentPhase(phase)
                .turns(state.session.getTurns())
                .totalTurns(state.session.getTotalTurns())
                .startedAt(state.session.getStartedAt())
                .completedAt(state.session.getCompletedAt())
                .transcriptUrl(state.session.getTranscriptUrl())
                .notes(state.session.getNotes())
                .build();

        state.session = updated;
        return Optional.of(updated);
    }

    public Optional<SpeakingSession> completeSession(String sessionId) {
        SessionState state = activeSessions.get(sessionId);
        if (state == null) return Optional.empty();

        SpeakingSession updated = SpeakingSession.builder()
                .id(state.session.getId())
                .userId(state.session.getUserId())
                .userName(state.session.getUserName())
                .userRole(state.session.getUserRole())
                .config(state.session.getConfig())
                .status("COMPLETED")
                .currentPhase("COMPLETED")
                .turns(state.session.getTurns())
                .totalTurns(state.session.getTotalTurns())
                .startedAt(state.session.getStartedAt())
                .completedAt(LocalDateTime.now())
                .transcriptUrl(state.session.getTranscriptUrl())
                .notes(state.session.getNotes())
                .build();

        state.session = updated;
        return Optional.of(updated);
    }

    public List<SpeakingTurn> getTurns(String sessionId) {
        SessionState state = activeSessions.get(sessionId);
        return state != null ? List.copyOf(state.turns) : List.of();
    }

    public void removeSession(String sessionId) {
        activeSessions.remove(sessionId);
    }

    public int getActiveSessionCount() {
        return activeSessions.size();
    }

    private static class SessionState {
        volatile SpeakingSession session;
        final List<SpeakingTurn> turns;

        SessionState(SpeakingSession session, List<SpeakingTurn> turns) {
            this.session = session;
            this.turns = turns;
        }
    }
}
