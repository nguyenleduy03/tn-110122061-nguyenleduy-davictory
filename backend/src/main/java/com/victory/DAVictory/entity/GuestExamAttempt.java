package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "guest_exam_attempts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuestExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(length = 100)
    private String email;

    @Column(length = 20)
    private String phone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id")
    private Test test;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Column(nullable = false, length = 20)
    private String status; // IN_PROGRESS, SUBMITTED, GRADED

    @Column(nullable = false)
    private LocalDateTime startedAt;

    @Column
    private LocalDateTime submittedAt;

    @Column
    private Integer timeLimitSeconds;

    @Column
    private Integer timeSpentSeconds;

    @Column
    private Integer totalAnswered;

    @Column
    private Integer totalCorrect;

    @Column
    private Double rawScore;

    @Column(precision = 2)
    private Double bandScore;

    @Column(length = 50)
    private String attemptType;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(columnDefinition = "TEXT")
    private String answersJson; // Store answers as JSON
}
