package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "speaking_frames")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingFrame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name; // e.g., "Home", "Work", "Music"

    @Column(nullable = false, length = 20)
    private String frameType; // "MANDATORY" or "OPTIONAL"

    @Column(columnDefinition = "JSON")
    private String questions; // JSON array of strings containing the questions

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
