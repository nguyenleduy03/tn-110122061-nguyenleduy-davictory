package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "passage_contents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PassageContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title; // Tiêu đề bài đọc

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content; // Toàn bộ nội dung bài đọc (HTML hoặc plain text)

    @Column(columnDefinition = "TEXT")
    private String contentHtml; // Phiên bản HTML có định dạng (in đậm, nghiêng, chú thích)

    @Column(length = 100)
    private String source; // Nguồn bài đọc: tạp chí, tên sách, website

    @Column(length = 100)
    private String author; // Tác giả

    @Column(length = 20)
    private String publishedYear; // Năm xuất bản

    @Column(length = 50)
    private String topic; // Chủ đề: Science, History, Environment, Technology...

    @Column
    private Integer wordCount; // Số từ trong bài

    @Column(length = 20)
    private String readingLevel;
    // Độ khó: "Intermediate", "Upper-Intermediate", "Advanced"

    @Column(columnDefinition = "TEXT")
    private String vocabulary;
    // JSON danh sách từ vựng quan trọng + nghĩa:
    // [{"word": "abundance", "meaning": "a very large quantity of something"}]

    @Column(columnDefinition = "TEXT")
    private String paragraphLabels;
    // JSON đánh dấu đoạn văn (cho dạng Matching Headings):
    // [{"label": "A", "startChar": 0, "endChar": 350}]

    // Liên kết với file ảnh minh họa (nếu có)
    @ManyToOne
    @JoinColumn(name = "image_media_id")
    private MediaFile imageMedia;

    @Column(nullable = false)
    private Boolean isActive = true;

    @Column(nullable = false)
    private Boolean isVerified = false; // Đã được kiểm duyệt

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "verified_by")
    private User verifiedBy;

    @Column
    private LocalDateTime verifiedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
