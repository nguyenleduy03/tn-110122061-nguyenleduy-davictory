package com.victory.DAVictory.entity;

import com.victory.DAVictory.enums.TestStatus;
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
@Table(name = "tests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Test {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title; // "IELTS Academic Mock Test 1", "Practice Test – Reading"

    @Column(length = 500)
    private String description; // Mô tả đề thi

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TestType testType; // ACADEMIC, GENERAL

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TestStatus status; // DRAFT, REVIEWING, PUBLISHED, ARCHIVED, DELETED

    @Column(nullable = false)
    private Boolean isFullTest = true;
    // true  = đề thi đầy đủ 4 kỹ năng
    // false = đề thi luyện từng kỹ năng riêng lẻ

    @Column
    private Integer durationMinutes; // Tổng thời gian (nếu full test: ~165 phút)

    @Column(length = 50)
    private String targetBand; // Band mục tiêu của đề: "6.0", "7.0"

    @Column(nullable = false)
    private Integer attemptCount = 0; // Số lượt thi

    @Column(nullable = false)
    private Double averageScore = 0.0; // Điểm trung bình của học viên

    // Thumbnail ảnh đại diện đề thi
    @ManyToOne
    @JoinColumn(name = "thumbnail_media_id")
    private MediaFile thumbnail;

    // Người tạo đề thi
    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // Người kiểm duyệt đề thi
    @ManyToOne
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column
    private LocalDateTime reviewedAt;

    @Column
    private LocalDateTime publishedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Relationships
    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<TestSession> testSessions = new ArrayList<>();

    @OneToOne(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true)
    private TestSetting testSetting;
}
