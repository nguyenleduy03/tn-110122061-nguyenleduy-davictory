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
 * Nhóm 10 - TAG & PHÂN LOẠI
 * Bảng topic_categories: chủ đề phân cấp cho câu hỏi
 * Hỗ trợ cây phân cấp cha–con (tự tham chiếu)
 *
 * Ví dụ cấu trúc:
 *   Society (parent)
 *     └── Education
 *     └── Crime & Punishment
 *   Natural World (parent)
 *     └── Environment
 *     └── Climate Change
 */
@Entity
@Table(name = "topic_categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TopicCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name; // Tên chủ đề: "Environment", "Education", "Technology"

    @Column(length = 50)
    private String code;
    // Mã định danh: ENVIRONMENT, EDUCATION, TECHNOLOGY, HEALTH,
    // CRIME, SOCIETY, CULTURE, SCIENCE, TRAVEL, MEDIA, WORK, SPORT

    @Column(length = 255)
    private String description; // Mô tả ngắn về chủ đề

    @Column(length = 500)
    private String iconUrl; // Icon chủ đề hiển thị trên UI

    @Column(length = 20)
    private String colorCode; // Màu sắc đại diện chủ đề

    // Hỗ trợ cấu trúc cây cha–con (self-reference)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private TopicCategory parent; // null = chủ đề gốc (root)

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL)
    @OrderBy("orderIndex ASC")
    private List<TopicCategory> children = new ArrayList<>();

    @Column(nullable = false)
    private Integer level;
    // Cấp độ trong cây: 0 = root, 1 = con, 2 = cháu...

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự hiển thị trong cùng cấp

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
