package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "test_question_groups")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestQuestionGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // TestPart chứa nhóm câu hỏi này
    @ManyToOne
    @JoinColumn(name = "test_part_id", nullable = false)
    private TestPart testPart;

    // QuestionGroup gốc từ ngân hàng câu hỏi
    @ManyToOne
    @JoinColumn(name = "question_group_id", nullable = false)
    private QuestionGroup questionGroup;

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự nhóm câu hỏi trong part

    @Column
    private Integer questionFrom; // Số câu bắt đầu trong đề thi tổng: 1, 11, 21, 31
    @Column
    private Integer questionTo;   // Số câu kết thúc:                  10, 20, 30, 40

    @Column(nullable = false)
    private Boolean isRandomOrder = false;
    // true = câu hỏi trong nhóm sẽ được xáo trộn khi thi

    @Column(length = 255)
    private String customTitle;
    // Override tiêu đề nhóm câu hỏi (null = dùng tên mặc định từ QuestionGroup)

    @Column(columnDefinition = "TEXT")
    private String customInstructions;
    // Override hướng dẫn riêng (null = dùng mặc định từ QuestionGroup)

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
