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
 * Bảng question_groups: nhóm câu hỏi (bài đọc, đoạn nghe, đoạn văn...)
 * Một group thuộc một Part và chứa nhiều câu hỏi dùng chung một ngữ cảnh,
 * ví dụ: Listening Part 1 có một đoạn hội thoại → 10 câu hỏi.
 */
@Entity
@Table(name = "question_groups")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part; // Thuộc phần thi nào

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_type_id")
    private QuestionType questionType; // Loại câu hỏi của group (MCQ, TFNG, FILL_BLANK...)

    @Column(nullable = false, length = 500)
    private String title; // Tiêu đề nhóm, ví dụ: "Questions 1-10", "Passage 1"

    @Column(length = 50)
    private String contentType;
    // READING_PASSAGE, AUDIO_TRANSCRIPT, STANDALONE, DIAGRAM, MAP, TABLE

    @Column(columnDefinition = "LONGTEXT")
    private String passageText;
    // Nội dung bài đọc / transcript đoạn nghe / bảng / sơ đồ

    @Column(length = 500)
    private String audioUrl; // URL file âm thanh (Listening)

    @Column(length = 500)
    private String imageUrl; // URL hình ảnh đính kèm (Map, Diagram)

    @Column(length = 500)
    private String resourceUrl; // URL tài nguyên khác

    @Column
    private Integer fromQuestion; // Số câu bắt đầu trong group (1, 11, 21...)

    @Column
    private Integer toQuestion;   // Số câu kết thúc trong group (10, 20, 30...)

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự trong part

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Một group có nhiều câu hỏi
    @OneToMany(mappedBy = "questionGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<Question> questions = new ArrayList<>();

    // Một group có nhiều matching pairs (dạng nối)
    @OneToMany(mappedBy = "questionGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<MatchingPair> matchingPairs = new ArrayList<>();
}
