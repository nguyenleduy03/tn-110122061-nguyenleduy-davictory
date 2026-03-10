package com.victory.DAVictory.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "parts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Part {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Quan hệ với session
    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Column(nullable = false, length = 100)
    private String name;
    // Listening: "Part 1", "Part 2", "Part 3", "Part 4"
    // Reading:   "Passage 1", "Passage 2", "Passage 3"
    // Writing:   "Task 1", "Task 2"
    // Speaking:  "Part 1 (Introduction)", "Part 2 (Long Turn)", "Part 3 (Discussion)"

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự: 1, 2, 3, 4...

    @Column(length = 500)
    private String description; // Mô tả nội dung phần thi

    @Column(columnDefinition = "TEXT")
    private String instructions; // Hướng dẫn chi tiết

    @Column
    private Integer durationMinutes; // Thời gian riêng (nếu có)

    @Column
    private Integer totalQuestions; // Số câu hỏi trong part này

    @Column
    private Double scoreWeight;
    // Writing Task 1: 33%, Task 2: 67%
    // Listening/Reading: đều nhau
    // Speaking: từng phần

    @Column(length = 100)
    private String questionFormat;
    // Multiple Choice, Fill in Blank, True/False/NG,
    // Matching, Short Answer, Map/Diagram, Table/Form,
    // Letter/Essay, Conversation

    // Quan hệ với độ khó
    @ManyToOne
    @JoinColumn(name = "difficulty_level_id")
    private DifficultyLevel difficultyLevel;

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
