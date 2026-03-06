package com.victory.DAVictory.entity;

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
@Table(name = "difficulty_levels")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DifficultyLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name; // Beginner, Elementary, Intermediate, Upper-Intermediate, Advanced

    @Column(nullable = false, unique = true)
    private Integer level; // 1, 2, 3, 4, 5 (thứ tự tăng dần)

    @Column(length = 10)
    private String bandRange; // Tương đương band IELTS: "4.0-5.0", "5.0-6.0", ...

    @Column(length = 255)
    private String description;

    @Column(length = 20)
    private String colorCode; // Màu hiển thị trên UI: #4CAF50, #FF9800, #F44336...

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "difficultyLevel")
    private List<Part> parts = new ArrayList<>();
}
