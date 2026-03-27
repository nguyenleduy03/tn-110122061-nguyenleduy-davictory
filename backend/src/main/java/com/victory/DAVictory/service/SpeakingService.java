package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.SpeakingGradeRequest;
import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SpeakingService {

    private final SpeakingAttemptRepository attemptRepository;
    private final SpeakingScoreRepository scoreRepository;
    private final UserRepository userRepository;

    @Transactional
    public void gradeSpeaking(Long attemptId, String teacherUsername, SpeakingGradeRequest req) {
        User teacher = userRepository.findByUsername(teacherUsername)
                .orElseThrow(() -> new RuntimeException("Teacher not found"));
        
        SpeakingAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Speaking attempt not found"));
        
        // Xóa điểm cũ nếu có
        scoreRepository.findBySpeakingAttemptId(attemptId).ifPresent(scoreRepository::delete);
        
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
        
        attempt.setOverallBandScore(avgBand);
        attempt.setStatus("GRADED");
        attemptRepository.save(attempt);
    }
    
    private double roundBandScore(double score) {
        double decimal = score - Math.floor(score);
        if (decimal < 0.25) return Math.floor(score);
        if (decimal < 0.75) return Math.floor(score) + 0.5;
        return Math.ceil(score);
    }
}
