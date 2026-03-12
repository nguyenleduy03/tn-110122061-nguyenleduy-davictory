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
@Table(name = "test_parts",
       uniqueConstraints = @UniqueConstraint(columnNames = {"test_session_id", "part_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestPart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // TestSession chứa part này
    @ManyToOne
    @JoinColumn(name = "test_session_id", nullable = false)
    private TestSession testSession;

    // Part gốc (Part 1, Part 2,... Passage 1, Task 1...)
    @ManyToOne
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự part trong session của đề thi

    @Column(nullable = false)
    private Boolean isIncluded = true;

    @Column
    private Integer questionCount;
    // Số câu hỏi thực tế lấy vào phần này (null = lấy toàn bộ)

    @Column
    private Integer durationMinutes;
    // Override thời gian riêng cho part này (null = dùng mặc định)

    @Column(columnDefinition = "TEXT")
    private String customInstructions;
    // Override hướng dẫn riêng cho part này trong đề thi (null = dùng từ Part gốc)

    @Column(length = 200)
    private String customName;
    // Override tên riêng cho part này trong đề thi (null = dùng từ Part gốc)

    // Media đính kèm: audio cho Listening, image cho Reading diagram
    @ManyToOne
    @JoinColumn(name = "media_file_id")
    private MediaFile mediaFile;

    // Passage đọc (dành cho Reading)
    @ManyToOne
    @JoinColumn(name = "passage_content_id")
    private PassageContent passageContent;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Các nhóm câu hỏi trong part này
    @OneToMany(mappedBy = "testPart", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<TestQuestionGroup> testQuestionGroups = new ArrayList<>();
}
