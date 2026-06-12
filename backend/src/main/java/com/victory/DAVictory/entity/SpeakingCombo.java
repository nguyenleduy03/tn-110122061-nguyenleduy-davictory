package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "speaking_combos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingCombo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title; // Title for admin management (e.g., "Combo: A memorable journey")

    // --- Part 2 Data ---
    @Column(nullable = false, columnDefinition = "TEXT")
    private String cueCardPrompt;

    @Column(columnDefinition = "JSON")
    private String bulletPoints; // JSON array of strings

    @Column(columnDefinition = "JSON")
    private String followUpQuestions; // JSON array of strings

    // --- Part 3 Data ---
    @Column(columnDefinition = "JSON")
    private String part3Questions; // JSON array of strings

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
