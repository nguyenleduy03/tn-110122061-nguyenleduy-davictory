package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 10 - TAG & PHÂN LOẠI
 * Bảng question_tag_map: bảng trung gian many-to-many giữa Question và Tag
 * Cho phép gắn nhiều tag chuẩn hóa vào một câu hỏi
 */
@Entity
@Table(name = "question_tag_map",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_question_tag_map",
                columnNames = {"question_id", "tag_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionTagMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false)
    private Tag tag;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tagged_by")
    private User taggedBy; // Người gắn tag (giảng viên / admin)

    @Column(length = 20)
    private String source;
    // MANUAL (giảng viên gắn tay), AUTO (AI tự gắn)

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
