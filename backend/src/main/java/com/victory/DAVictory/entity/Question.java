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

/**
 * Nhóm 3 - NGÂN HÀNG CÂU HỎI
 * Bảng questions: câu hỏi cụ thể
 */
@Entity
@Table(name = "questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_group_id", nullable = false)
    private QuestionGroup questionGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_type_id", nullable = false)
    private QuestionType questionType;

    @Column(nullable = false)
    private Integer questionNumber;
    // Số thứ tự câu hỏi trong bài thi (1-40 đối với Listening/Reading)

    @Column
    private Integer questionCount = 1;
    // Số câu hỏi hiển thị (cho MCQ multiple: 1=câu đơn, 2=câu 1-2)

    @Column(length = 255)
    private String groupInstruction;
    // Instruction chung cho nhóm câu (VD: "Choose TWO correct answers.")

    @Column(columnDefinition = "TEXT")
    private String questionText; // Nội dung câu hỏi / yêu cầu

    @Column(columnDefinition = "TEXT")
    private String blankContext;
    // Câu chứa chỗ trống, ví dụ: "The event starts at ___"

    @Column
    private Double pinX; // Tọa độ X của ô pin trên bản đồ (MAP_DIAGRAM)

    @Column
    private Double pinY; // Tọa độ Y của ô pin trên bản đồ (MAP_DIAGRAM)

    @Column(length = 500)
    private String imageUrl; // Hình minh hoạ cho câu hỏi (nếu có)

    @Column(nullable = false)
    private Double points = 1.0; // Điểm cho câu này (mặc định 1)

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự trong group

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Quan hệ với các lựa chọn (MCQ, TFNG...)
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<QuestionOption> options = new ArrayList<>();

    // Quan hệ với đáp án (Fill blank, Short answer...)
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Answer> answers = new ArrayList<>();

    // Gợi ý
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("hintOrder ASC")
    private List<QuestionHint> hints = new ArrayList<>();

    // Giải thích đáp án
    @OneToOne(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    private QuestionExplanation explanation;

    // Tags
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuestionTag> tags = new ArrayList<>();
}
