package com.victory.DAVictory.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 3 - NGÂN HÀNG CÂU HỎI
 * Bảng question_hints: gợi ý cho từng câu hỏi
 * Hiển thị theo cấp độ (hint 1 → hint 2 → hint 3)
 */
@Entity
@Table(name = "question_hints")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionHint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String hintText; // Nội dung gợi ý

    @Column(nullable = false)
    private Integer hintOrder; // Thứ tự gợi ý: 1 (nhẹ) → 3 (chi tiết hơn)

    @Column(length = 20)
    private String hintType;
    // VOCABULARY, GRAMMAR, LOCATION, STRATEGY, KEYWORD

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
