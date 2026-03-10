package com.victory.DAVictory.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
 * Bảng question_types: các loại câu hỏi IELTS
 * Ví dụ: MCQ, True/False/Not Given, Fill in Blank, Matching, Short Answer...
 */
@Entity
@Table(name = "question_types")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;
    // MCQ, TFNG (True/False/Not Given), YNNG (Yes/No/Not Given),
    // FILL_BLANK, MATCHING, SHORT_ANSWER, MAP_DIAGRAM,
    // TABLE_FORM, SENTENCE_COMPLETION, SUMMARY_COMPLETION,
    // NOTE_COMPLETION, FLOW_CHART, LETTER_ESSAY

    @Column(nullable = false, length = 100)
    private String displayName; // Tên hiển thị: "Multiple Choice", "True/False/Not Given"...

    @Column(columnDefinition = "TEXT")
    private String description; // Mô tả dạng câu hỏi

    @Column(columnDefinition = "TEXT")
    private String instructions; // Hướng dẫn chung cho dạng câu hỏi này

    @Column(length = 20)
    private String applicableSkills;
    // LISTENING, READING, WRITING, SPEAKING, ALL, LISTENING_READING

    @Column(nullable = false)
    private Boolean hasOptions = false; // Có lựa chọn đáp án (MCQ, TFNG...)

    @Column(nullable = false)
    private Boolean hasTextAnswer = false; // Câu hỏi điền (Fill blank, Short answer...)

    @Column(nullable = false)
    private Boolean hasMatching = false; // Dạng nối

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự hiển thị

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Quan hệ ngược
    @JsonIgnore
    @OneToMany(mappedBy = "questionType")
    private List<Question> questions = new ArrayList<>();
}
