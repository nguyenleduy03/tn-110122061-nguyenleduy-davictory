package com.victory.DAVictory.entity;

import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.enums.TestType;
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
@Table(name = "sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name; // "Listening", "Reading", "Writing", "Speaking"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SkillType skillType; // LISTENING, READING, WRITING, SPEAKING

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TestType testType; // ACADEMIC, GENERAL

    @Column(length = 500)
    private String description; // Mô tả kỹ năng

    @Column(nullable = false)
    private Integer durationMinutes; // Thời gian làm bài (phút)
    // Listening: 30, Reading: 60, Writing: 60, Speaking: 11-14

    @Column(nullable = false)
    private Integer totalQuestions; // Tổng số câu hỏi
    // Listening: 40, Reading: 40, Writing: 2, Speaking: varies

    @Column(nullable = false)
    private Double maxScore; // Điểm tối đa (band 0-9)

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự trong bài thi: 1, 2, 3, 4

    @Column(nullable = false)
    private Boolean isActive = true;

    @Column(columnDefinition = "TEXT")
    private String instructions; // Hướng dẫn làm bài

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Relationship: một session có nhiều parts
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<Part> parts = new ArrayList<>();
}
