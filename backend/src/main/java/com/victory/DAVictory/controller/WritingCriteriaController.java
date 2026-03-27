package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.WritingScoringCriteria;
import com.victory.DAVictory.repository.WritingScoringCriteriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/writing/criteria")
@RequiredArgsConstructor
public class WritingCriteriaController {

    private final WritingScoringCriteriaRepository criteriaRepository;

    @GetMapping
    public ResponseEntity<List<WritingScoringCriteria>> getAllCriteria() {
        return ResponseEntity.ok(criteriaRepository.findAll());
    }
}
