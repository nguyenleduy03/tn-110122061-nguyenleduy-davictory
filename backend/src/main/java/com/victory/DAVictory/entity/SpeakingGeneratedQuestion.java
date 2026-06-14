package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "speaking_generated_questions", indexes = {
    @Index(name = "idx_sgq_attempt", columnList = "speaking_attempt_id"),
    @Index(name = "idx_sgq_attempt_part", columnList = "speaking_attempt_id, part")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingGeneratedQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long speakingAttemptId;

    @Column(nullable = false, length = 30)
    private String part;

    @Column(nullable = false)
    private Integer questionIndex;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(columnDefinition = "TEXT")
    private String frameName;

    @Column(columnDefinition = "TEXT")
    private String comboTitle;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
