package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.SpeakingGenerationRequest;
import com.victory.DAVictory.dto.SpeakingGenerationResponse;
import com.victory.DAVictory.dto.SpeakingSnapshotRequest;
import com.victory.DAVictory.entity.SpeakingCombo;
import com.victory.DAVictory.entity.SpeakingFrame;
import com.victory.DAVictory.entity.SpeakingGeneratedQuestion;
import com.victory.DAVictory.repository.SpeakingComboRepository;
import com.victory.DAVictory.repository.SpeakingFrameRepository;
import com.victory.DAVictory.repository.SpeakingGeneratedQuestionRepository;
import com.victory.DAVictory.service.SpeakingGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/speaking-gen")
@RequiredArgsConstructor
@Slf4j
public class SpeakingBankController {

    private final SpeakingFrameRepository frameRepository;
    private final SpeakingComboRepository comboRepository;
    private final SpeakingGenerationService generationService;
    private final SpeakingGeneratedQuestionRepository snapshotRepository;

    // --- Generation Endpoint ---
    @PostMapping("/build")
    public ResponseEntity<SpeakingGenerationResponse> generateSpeakingTest(@RequestBody SpeakingGenerationRequest request) {
        log.info("=== /build called, profile={}, attemptId={}, config={}",
            request.getCandidateProfile(), request.getAttemptId(), request.getConfig() != null ? "present" : "null");
        return ResponseEntity.ok(generationService.generateTest(request));
    }

    // --- Snapshot Endpoints ---
    @PostMapping("/snapshot")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> saveSnapshot(@RequestBody SpeakingSnapshotRequest req) {
        if (req.getExamAttemptId() == null || req.getQuestions() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing examAttemptId or questions"));
        }
        snapshotRepository.deleteBySpeakingAttemptId(req.getExamAttemptId());
        List<SpeakingGeneratedQuestion> entities = req.getQuestions().stream().map(q -> {
            SpeakingGeneratedQuestion e = new SpeakingGeneratedQuestion();
            e.setSpeakingAttemptId(req.getExamAttemptId());
            e.setPart(q.getPart());
            e.setQuestionIndex(q.getQuestionIndex());
            e.setQuestionText(q.getQuestionText());
            e.setFrameName(q.getFrameName());
            e.setComboTitle(q.getComboTitle());
            return e;
        }).collect(Collectors.toList());
        snapshotRepository.saveAll(entities);
        return ResponseEntity.ok(Map.of("saved", entities.size()));
    }

    @GetMapping("/snapshot/{examAttemptId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SpeakingGeneratedQuestion>> getSnapshot(@PathVariable Long examAttemptId) {
        return ResponseEntity.ok(
            snapshotRepository.findBySpeakingAttemptIdOrderByQuestionIndexAsc(examAttemptId));
    }

    // --- Frames ---
    @GetMapping("/frames")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN', 'STUDENT')")
    public ResponseEntity<List<SpeakingFrame>> getAllFrames() {
        return ResponseEntity.ok(frameRepository.findByIsActiveTrue());
    }

    @PostMapping("/frames")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<SpeakingFrame> createFrame(@RequestBody SpeakingFrame frame) {
        return ResponseEntity.ok(frameRepository.save(frame));
    }

    @PutMapping("/frames/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<SpeakingFrame> updateFrame(@PathVariable Long id, @RequestBody SpeakingFrame frameDetails) {
        return frameRepository.findById(id)
                .map(frame -> {
                    frame.setName(frameDetails.getName());
                    frame.setFrameType(frameDetails.getFrameType());
                    frame.setQuestions(frameDetails.getQuestions());
                    frame.setIsActive(frameDetails.getIsActive());
                    return ResponseEntity.ok(frameRepository.save(frame));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // --- Combos ---
    @GetMapping("/combos")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN', 'STUDENT')")
    public ResponseEntity<List<SpeakingCombo>> getAllCombos() {
        return ResponseEntity.ok(comboRepository.findByIsActiveTrue());
    }

    @PostMapping("/combos")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<SpeakingCombo> createCombo(@RequestBody SpeakingCombo combo) {
        return ResponseEntity.ok(comboRepository.save(combo));
    }

    @PutMapping("/combos/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<SpeakingCombo> updateCombo(@PathVariable Long id, @RequestBody SpeakingCombo comboDetails) {
        return comboRepository.findById(id)
                .map(combo -> {
                    combo.setTitle(comboDetails.getTitle());
                    combo.setCueCardPrompt(comboDetails.getCueCardPrompt());
                    combo.setBulletPoints(comboDetails.getBulletPoints());
                    combo.setFollowUpQuestions(comboDetails.getFollowUpQuestions());
                    combo.setPart3Questions(comboDetails.getPart3Questions());
                    combo.setIsActive(comboDetails.getIsActive());
                    return ResponseEntity.ok(comboRepository.save(combo));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
