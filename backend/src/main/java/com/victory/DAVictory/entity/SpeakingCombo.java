package com.victory.DAVictory.entity;

import com.victory.DAVictory.config.StringListConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "speaking_combos", indexes = {
    @Index(name = "idx_combo_is_active", columnList = "isActive")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingCombo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String cueCardPrompt;

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "JSON")
    private List<String> bulletPoints = new ArrayList<>();

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "JSON")
    private List<String> followUpQuestions = new ArrayList<>();

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "JSON")
    private List<String> part3Questions = new ArrayList<>();

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
