package com.victory.DAVictory.controller;

import com.victory.DAVictory.dto.SpeakingGenerationRequest;
import com.victory.DAVictory.dto.SpeakingGenerationResponse;
import com.victory.DAVictory.entity.SpeakingCombo;
import com.victory.DAVictory.entity.SpeakingFrame;
import com.victory.DAVictory.repository.SpeakingComboRepository;
import com.victory.DAVictory.repository.SpeakingFrameRepository;
import com.victory.DAVictory.service.SpeakingGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/speaking-bank")
@RequiredArgsConstructor
public class SpeakingBankController {

    private final SpeakingFrameRepository frameRepository;
    private final SpeakingComboRepository comboRepository;
    private final SpeakingGenerationService generationService;

    // --- Generation Endpoint ---
    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('TEACHER', 'MANAGER', 'ADMIN', 'STUDENT')")
    public ResponseEntity<SpeakingGenerationResponse> generateSpeakingTest(@RequestBody SpeakingGenerationRequest request) {
        return ResponseEntity.ok(generationService.generateTest(request));
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
