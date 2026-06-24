package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.SpeakingAttemptResponse;
import com.victory.DAVictory.dto.SpeakingGradeRequest;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpeakingService {

    private final SpeakingAttemptRepository attemptRepository;
    private final SpeakingScoreRepository scoreRepository;
    private final SpeakingFeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final ClassStudentRepository classStudentRepository;

    @Transactional(readOnly = true)
    public SpeakingAttemptResponse getAttemptDetail(Long attemptId, String teacherUsername) {
        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        // Try direct ID first, then exam attempt ID
        SpeakingAttempt attempt = attemptRepository.findById(attemptId)
                .orElseGet(() -> attemptRepository.findByExamAttemptId(attemptId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nói ID=" + attemptId)));

        validateTeacherCanAccessSpeakingAttempt(teacher, attempt);

        SpeakingAttemptResponse response = new SpeakingAttemptResponse();
        response.setId(attempt.getId());
        response.setUserId(attempt.getUser().getId());
        response.setUsername(attempt.getUser().getUsername());
        response.setSpeakingPart(attempt.getSpeakingPart());
        response.setStatus(attempt.getStatus());
        response.setOverallBandScore(attempt.getOverallBandScore());
        response.setStartedAt(attempt.getStartedAt());
        response.setSubmittedAt(attempt.getSubmittedAt());
        response.setGradedAt(attempt.getGradedAt());

        if (attempt.getScore() != null) {
            SpeakingAttemptResponse.ScoreDTO scoreDTO = new SpeakingAttemptResponse.ScoreDTO();
            scoreDTO.setFluencyCoherence(attempt.getScore().getFluencyCoherence());
            scoreDTO.setLexicalResource(attempt.getScore().getLexicalResource());
            scoreDTO.setGrammaticalRangeAccuracy(attempt.getScore().getGrammaticalRangeAccuracy());
            scoreDTO.setPronunciation(attempt.getScore().getPronunciation());
            scoreDTO.setOverallBandScore(attempt.getScore().getOverallBandScore());
            response.setScore(scoreDTO);
        }

        if (attempt.getFeedback() != null) {
            response.setOverallFeedback(attempt.getFeedback().getOverallFeedback());
        }

        List<SpeakingAttemptResponse.RecordingDTO> recordingDTOs = attempt.getRecordings().stream()
                .map(rec -> {
                    SpeakingAttemptResponse.RecordingDTO dto = new SpeakingAttemptResponse.RecordingDTO();
                    dto.setId(rec.getId());
                    dto.setAudioUrl(rec.getAudioUrl());
                    dto.setTranscript(rec.getTranscript());
                    dto.setTranscriptStatus(rec.getTranscriptStatus());
                    dto.setRecordingPart(rec.getRecordingPart());
                    dto.setDurationSeconds(rec.getDurationSeconds());
                    return dto;
                })
                .collect(Collectors.toList());
        response.setRecordings(recordingDTOs);

        return response;
    }

    @Transactional
    public void gradeSpeaking(Long attemptId, String teacherUsername, SpeakingGradeRequest req) {
        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));
        
        // Try direct ID first, then exam attempt ID
        SpeakingAttempt attempt = attemptRepository.findById(attemptId)
                .orElseGet(() -> attemptRepository.findByExamAttemptId(attemptId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy bài nói ID=" + attemptId)));

        validateTeacherCanAccessSpeakingAttempt(teacher, attempt);

        Long speakingAttemptId = attempt.getId();
        
        // Xóa điểm cũ nếu có
        scoreRepository.findBySpeakingAttemptId(speakingAttemptId).ifPresent(scoreRepository::delete);
        
        // Tính band score trung bình
        double total = req.getFluencyCoherence() + req.getLexicalResource() + 
                      req.getGrammaticalRangeAccuracy() + req.getPronunciation();
        double avgBand = roundBandScore(total / 4.0);
        
        SpeakingScore score = new SpeakingScore();
        score.setSpeakingAttempt(attempt);
        score.setFluencyCoherence(req.getFluencyCoherence());
        score.setLexicalResource(req.getLexicalResource());
        score.setGrammaticalRangeAccuracy(req.getGrammaticalRangeAccuracy());
        score.setPronunciation(req.getPronunciation());
        score.setOverallBandScore(avgBand);
        score.setScoredBy(teacher);
        score.setScoredAt(LocalDateTime.now());
        scoreRepository.save(score);

        // Lưu feedback
        if (req.getFeedback() != null && !req.getFeedback().trim().isEmpty()) {
            feedbackRepository.findBySpeakingAttemptId(speakingAttemptId).ifPresent(feedbackRepository::delete);
            SpeakingFeedback feedback = new SpeakingFeedback();
            feedback.setSpeakingAttempt(attempt);
            feedback.setOverallFeedback(req.getFeedback().trim());
            feedback.setCreatedBy(teacher);
            feedback.setFeedbackAt(LocalDateTime.now());
            feedbackRepository.save(feedback);
        }
        
        attempt.setOverallBandScore(avgBand);
        attempt.setStatus("GRADED");
        attempt.setGradedAt(LocalDateTime.now());
        attemptRepository.save(attempt);
    }

    private void validateTeacherCanAccessSpeakingAttempt(User teacher, SpeakingAttempt attempt) {
        Long studentId = attempt.getUser().getId();
        if (teacher.getId().equals(studentId)) return;

        boolean isAdmin = hasRoleLike(teacher, "ADMIN") || hasRoleLike(teacher, "MANAGER");
        if (isAdmin) return;

        List<Long> studentIds = classStudentRepository.findStudentIdsByTeacherUsername(teacher.getUsername());
        if (!studentIds.contains(studentId)) {
            throw new RuntimeException("Không có quyền xem/chấm bài nói của học viên này");
        }
    }

    private boolean hasRoleLike(User user, String expected) {
        if (user == null || user.getRoles() == null || expected == null) return false;
        String normalizedExpected = expected.trim().toUpperCase(Locale.ROOT);
        return user.getRoles().stream().anyMatch(role -> {
            String roleName = role != null ? role.getName() : null;
            if (roleName == null || roleName.isBlank()) return false;
            String normalized = roleName.trim().toUpperCase(Locale.ROOT);
            return normalized.equals(normalizedExpected) || normalized.equals("ROLE_" + normalizedExpected);
        });
    }

    private double roundBandScore(double score) {
        double decimal = score - Math.floor(score);
        if (decimal < 0.25) return Math.floor(score);
        if (decimal < 0.75) return Math.floor(score) + 0.5;
        return Math.ceil(score);
    }
}
